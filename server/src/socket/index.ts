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
    const userRoom = String(userId);
    socket.join(userRoom);
    console.log(`Socket ${socket.id} joined room ${userRoom}`);

    // Automatically join all class rooms the user belongs to
    try {
        if (role === 'TEACHER') {
            const courses = await prisma.course.findMany({
                where: { teacherId: userId },
                select: { classId: true }
            });
            courses.forEach(c => {
                const classRoom = String(c.classId);
                socket.join(classRoom);
                console.log(`Teacher ${userId} joined class room ${classRoom}`);
            });
        } else if (role === 'STUDENT') {
            const enrollments = await prisma.enrollment.findMany({
                where: { studentId: userId },
                select: { classId: true }
            });
            enrollments.forEach(e => {
                const classRoom = String(e.classId);
                socket.join(classRoom);
                console.log(`Student ${userId} joined class room ${classRoom}`);
            });
        }
    } catch (error) {
        console.error("Error joining rooms on connection", error);
    }

    socket.on("join_class", (classId: string) => {
        const classRoom = String(classId);
        socket.join(classRoom);
        console.log(`User ${userId} (Socket ${socket.id}) manually joined class ${classRoom}`);
    });

    socket.on("send_message", async (data) => {
        // data: { content, receiverId?, classId?, attachmentUrl?, attachmentType? }
        try {
            const senderId = String(userId);
            const targetId = data.classId ? String(data.classId) : (data.receiverId ? String(data.receiverId) : null);
            
            console.log(`[Socket] Message from ${senderId} to ${targetId} (Class: ${!!data.classId})`);
            
            if (!targetId) {
                console.warn("[Socket] No target specified for message");
                return;
            }

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

            console.log(`[Socket] Message created in DB: ${message.id}`);

            // Emit to receiver or class
            if (data.classId) {
                const roomName = String(data.classId);
                const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
                console.log(`[Socket] Emitting to class room ${roomName} (Size: ${roomSize})`);
                io.to(roomName).emit("receive_message", message);
            } else if (data.receiverId) {
                const roomName = String(data.receiverId);
                const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
                console.log(`[Socket] Emitting to user room ${roomName} (Size: ${roomSize})`);
                
                io.to(roomName).emit("receive_message", message);
                
                // Also emit to sender's own room (in case they have multiple tabs)
                if (roomName !== senderId) {
                    console.log(`[Socket] Also emitting back to sender room ${senderId}`);
                    io.to(senderId).emit("receive_message", message);
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
