import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const broadcastSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  targetRole: z.enum(["SCHOOL_ADMIN", "TEACHER", "STUDENT", "ALL"]).default("SCHOOL_ADMIN"), // Optional targeting
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
    const { title, message, targetRole } = broadcastSchema.parse(req.body);

    // Find all target users
    let whereClause: any = {};
    
    // Scoping for SCHOOL_ADMIN
    if (req.user?.role === 'SCHOOL_ADMIN') {
        if (!req.user.schoolId) {
            return res.status(400).json({ message: "School Admin has no school assigned" });
        }
        whereClause.schoolId = req.user.schoolId;
    }

    if (targetRole !== "ALL") {
        whereClause.role = targetRole;
    } else {
        // Exclude SUPER_ADMIN from receiving their own broadcast if desired, 
        // or keep it to see what was sent. Let's exclude sending to self maybe?
        // simple: send to everyone except super admin
        whereClause.role = { not: "SUPER_ADMIN" };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (users.length === 0) {
      return res.json({ message: "No users found to notify" });
    }

    // Bulk create notifications using a loop for better compatibility if createMany fails
    for (const u of users) {
      await prisma.notification.create({
        data: {
          title,
          message,
          userId: u.id,
          read: false
        }
      });
    }

    res.status(201).json({ message: `Notification sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ message: "Error broadcasting notification", error });
  }
};
