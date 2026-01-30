import type { Response } from "express";
import { supabase } from "../utils/supabase.js";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

export const uploadChatFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `chat_uploads/${fileName}`;

        const { data, error } = await supabase.storage
            .from('materials') // Reusing materials bucket or create a new one 'chat-uploads'
            .upload(filePath, file.buffer, {
                contentType: file.mimetype
            });

        if (error) {
            console.error("Supabase upload error:", error);
            return res.status(500).json({ message: "Upload failed" });
        }

        const { data: publicData } = supabase.storage
            .from('materials')
            .getPublicUrl(filePath);

        res.json({ 
            url: publicData.publicUrl,
            type: file.mimetype.startsWith('image/') ? 'IMAGE' : 
                  file.mimetype === 'application/pdf' ? 'PDF' : 
                  file.mimetype.includes('video') ? 'VIDEO' : 'DOC',
            originalName: file.originalname
        });

    } catch (error) {
        console.error("Error uploading chat file", error);
        res.status(500).json({ message: "Server error during upload" });
    }
};

export const getClassHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.params;
        const messages = await prisma.message.findMany({
            where: { classId: String(classId) },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Error fetching history", error });
    }
};

export const getPrivateHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params; // The other user
        const currentUserId = req.user?.id;
        
        if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: String(userId) },
                    { senderId: String(userId), receiverId: currentUserId }
                ]
            },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Error fetching history", error });
    }
};

export const getContacts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        let contacts: any[] = [];

        // If Teacher, get students in their classes
        if (role === 'TEACHER') {
             // Logic to find students enrolled in courses taught by this teacher
             const courses = await prisma.course.findMany({
                 where: { teacherId: userId },
                 include: {
                     class: {
                         include: {
                             enrollments: {
                                 include: { 
                                     student: {
                                         select: { id: true, firstName: true, lastName: true, role: true, isOnline: true }
                                     } 
                                 }
                             }
                         }
                     }
                 }
             });
             
             const studentMap = new Map();
             courses.forEach(c => {
                 c.class.enrollments.forEach(e => {
                     if (!studentMap.has(e.student.id)) {
                         studentMap.set(e.student.id, e.student);
                     }
                 });
             });
             contacts = Array.from(studentMap.values());
        } 
        // If Student, get teachers of their courses
        else if (role === 'STUDENT') {
             const enrollments = await prisma.enrollment.findMany({
                 where: { studentId: userId },
                 include: {
                     class: {
                         include: {
                             courses: {
                                 include: { 
                                     teacher: {
                                         select: { id: true, firstName: true, lastName: true, role: true, isOnline: true }
                                     } 
                                 }
                             }
                         }
                     }
                 }
             });
             
             const teacherMap = new Map();
             enrollments.forEach(e => {
                 e.class.courses.forEach(c => {
                     if (!teacherMap.has(c.teacher.id)) {
                         teacherMap.set(c.teacher.id, c.teacher);
                     }
                 });
             });
             contacts = Array.from(teacherMap.values());
        }
        
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching contacts", error });
    }
}
