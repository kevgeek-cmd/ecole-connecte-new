import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

interface AuthSocket extends Socket {
  user?: any;
}

export const setupSocket = (io: Server) => {
  io.use(async (socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      socket.user = decoded;
      
      // Update online status
      await prisma.user.update({
          where: { id: (decoded as any).id },
          data: { isOnline: true }
      });
      
      // Broadcast online status
      io.emit("user_status_update", { userId: (decoded as any).id, isOnline: true });

      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket: AuthSocket) => {
    const userId = socket.user.id;
    const role = socket.user.role;
    console.log(`User connected: ${userId} (${role})`);

    // Join user's own room for private messages
    const userRoom = `user:${userId}`;
    socket.join(userRoom);
    console.log(`Socket ${socket.id} joined private room ${userRoom}`);

    // Automatically join all class rooms the user belongs to
    try {
        if (role === 'TEACHER') {
            const courses = await prisma.course.findMany({
                where: { teacherId: userId },
                select: { classId: true }
            });
            courses.forEach(c => {
                const classRoom = `class:${c.classId}`;
                socket.join(classRoom);
                console.log(`Teacher ${userId} joined class room ${classRoom}`);
            });
        } else if (role === 'STUDENT') {
            const enrollments = await prisma.enrollment.findMany({
                where: { studentId: userId },
                select: { classId: true }
            });
            enrollments.forEach(e => {
                const classRoom = `class:${e.classId}`;
                socket.join(classRoom);
                console.log(`Student ${userId} joined class room ${classRoom}`);
            });
        }
    } catch (error) {
        console.error("Error joining rooms on connection", error);
    }

    socket.on("join_class", (classId: string) => {
        const classRoom = `class:${classId}`;
        socket.join(classRoom);
        console.log(`User ${userId} (Socket ${socket.id}) manually joined class ${classRoom}`);
    });

    socket.on("send_message", async (data) => {
        // data: { content, receiverId?, classId?, attachmentUrl?, attachmentType? }
        try {
            const senderId = String(userId);
            const targetId = data.classId ? String(data.classId) : (data.receiverId ? String(data.receiverId) : null);
            
            if (!targetId) return;

            const message = await prisma.message.create({
                data: {
                    content: data.content || "",
                    senderId: senderId,
                    receiverId: data.classId ? null : targetId,
                    classId: data.classId ? targetId : null,
                    attachmentUrl: data.attachmentUrl || null,
                    attachmentType: data.attachmentType || null
                },
                include: {
                    sender: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            // Emit to receiver or class
            if (data.classId) {
                const roomName = `class:${data.classId}`;
                console.log(`[Socket] Emitting to class room ${roomName}`);
                io.to(roomName).emit("receive_message", message);
            } else if (data.receiverId) {
                const receiverRoom = `user:${data.receiverId}`;
                const senderRoom = `user:${senderId}`;
                
                console.log(`[Socket] Emitting from ${senderRoom} to ${receiverRoom}`);
                
                // Send to receiver
                io.to(receiverRoom).emit("receive_message", message);
                
                // Send to sender (all their tabs)
                if (receiverRoom !== senderRoom) {
                    io.to(senderRoom).emit("receive_message", message);
                }
            }
        } catch (e) {
            console.error("[Socket] Error sending message:", e);
        }
    });

    socket.on("disconnect", async () => {
       console.log(`User disconnected: ${userId}`);
       try {
           await prisma.user.update({
               where: { id: userId },
               data: { isOnline: false }
           });
           io.emit("user_status_update", { userId, isOnline: false });
       } catch(e) { console.error(e); }
    });
  });
};
