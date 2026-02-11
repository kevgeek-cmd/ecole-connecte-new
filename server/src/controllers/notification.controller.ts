import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const broadcastSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  targetRoles: z.array(z.enum(["SCHOOL_ADMIN", "TEACHER", "STUDENT", "IT_ADMIN", "EDUCATOR", "ALL"])).optional(),
  targetSchoolIds: z.array(z.string()).optional(),
  targetUserIds: z.array(z.string()).optional(),
});

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification", error });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    // Users can delete their own notifications
    const notification = await prisma.notification.findFirst({
        where: { id, userId }
    });

    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification", error });
  }
}

export const broadcastNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, targetRoles, targetSchoolIds, targetUserIds } = broadcastSchema.parse(req.body);

    // Find all target users
    let whereClause: any = {};
    
    // Scoping for SCHOOL_ADMIN (or EDUCATOR if they have permission)
    if (req.user?.role === 'SCHOOL_ADMIN' || req.user?.role === 'EDUCATOR') {
        if (!req.user.schoolId) {
            return res.status(400).json({ message: "User has no school assigned" });
        }
        whereClause.schoolId = req.user.schoolId;
        
        // Filter by specific roles if provided and not containing "ALL"
        if (targetRoles && targetRoles.length > 0 && !targetRoles.includes("ALL")) {
            whereClause.role = { in: targetRoles };
        } else {
             whereClause.role = { not: "SUPER_ADMIN" }; 
        }
    } else if (req.user?.role === 'SUPER_ADMIN') {
        // Super Admin Logic
        
        // 1. Specific Users (e.g., Specific School Admins)
        if (targetUserIds && targetUserIds.length > 0) {
            whereClause.id = { in: targetUserIds };
        }
        // 2. Specific Schools (All users in those schools)
        else if (targetSchoolIds && targetSchoolIds.length > 0) {
            whereClause.schoolId = { in: targetSchoolIds };
            // Optional: Filter by roles
            if (targetRoles && targetRoles.length > 0 && !targetRoles.includes("ALL")) {
                whereClause.role = { in: targetRoles };
            }
        }
        // 3. Global Role-based
        else if (targetRoles && targetRoles.length > 0 && !targetRoles.includes("ALL")) {
            whereClause.role = { in: targetRoles };
        }
        // 4. Global Broadcast (All Users)
        else {
             whereClause.role = { not: "SUPER_ADMIN" }; // Don't notify self
        }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (users.length === 0) {
      return res.json({ message: "No users found to notify" });
    }

    // Bulk create notifications using a loop for better compatibility if createMany fails
    // (Prisma createMany is supported for Notification, but let's stick to loop or createMany)
    // Using createMany is much faster for thousands of users
    await prisma.notification.createMany({
        data: users.map(u => ({
            title,
            message,
            userId: u.id,
            read: false
        }))
    });

    res.status(201).json({ message: `Notification sent to ${users.length} users` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error broadcasting notification", error });
  }
};
