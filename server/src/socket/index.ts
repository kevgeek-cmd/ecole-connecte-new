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

  io.on("connection", (socket: AuthSocket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${userId}`);

    // Join user's own room for private messages
    socket.join(userId);
    console.log(`Socket ${socket.id} joined room ${userId}`);

    socket.on("join_class", (classId: string) => {
        socket.join(classId);
        console.log(`User ${userId} (Socket ${socket.id}) joined class ${classId}`);
    });

    socket.on("send_message", async (data) => {
        // data: { content, receiverId?, classId?, attachmentUrl?, attachmentType? }
        try {
            console.log(`[Socket] Message from ${userId} to ${data.receiverId || data.classId} (Class: ${!!data.classId})`);
            
            const message = await prisma.message.create({
                data: {
                    content: data.content,
                    senderId: userId,
                    receiverId: data.receiverId || null,
                    classId: data.classId || null,
                    attachmentUrl: data.attachmentUrl || null,
                    attachmentType: data.attachmentType || null
                },
                include: {
                    sender: { select: { id: true, firstName: true, lastName: true } }
                }
            });

            // Emit to receiver or class
            if (data.classId) {
                const roomSize = io.sockets.adapter.rooms.get(data.classId)?.size || 0;
                console.log(`[Socket] Emitting to class ${data.classId} (Size: ${roomSize})`);
                io.to(data.classId).emit("receive_message", message);
            } else if (data.receiverId) {
                const roomSize = io.sockets.adapter.rooms.get(data.receiverId)?.size || 0;
                console.log(`[Socket] Emitting to user ${data.receiverId} (Size: ${roomSize})`);
                
                io.to(data.receiverId).emit("receive_message", message);
                // Also emit to sender (if they have multiple tabs or just for confirmation)
                socket.emit("receive_message", message);
            }
        } catch (e) {
            console.error("Error sending message", e);
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
