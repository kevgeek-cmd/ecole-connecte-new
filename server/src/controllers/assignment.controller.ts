import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createAssignmentSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string().transform((str) => new Date(str)),
  courseId: z.string(),
});

const submitAssignmentSchema = z.object({
  content: z.string().optional(),
  fileUrl: z.string().optional(),
});

const gradeSubmissionSchema = z.object({
  value: z.number().min(0).max(20),
  comment: z.string().optional(),
});

export const createAssignment = async (req: AuthRequest, res: Response) => {
  try {
    // If file uploaded, handle it if we add attachment support later. 
    // For now, user requested "create assignments (PDF or Word)". 
    // This implies teacher uploads the assignment instructions file.
    // The current schema doesn't have an "attachmentUrl" on Assignment model, 
    // but the user requirement implies it.
    // However, I must stick to the schema or modify it. 
    // The user said "create courses... and assignments... upload from local".
    // I will assume for now "Description" can contain the link or I should check if I can store it.
    // Looking at schema: Assignment has title, description, dueDate. No fileUrl.
    // I will append the file link to the description if a file is uploaded, 
    // to avoid schema migration in this step if possible, OR just rely on text description.
    // Wait, the user said "assignments... PDF or Word". 
    // It's better to add a fileUrl to Assignment model, OR use Material for course files.
    // But Assignment is separate.
    // Let's look at the request: "assignments... PDF or Word".
    // I will append the download link to the description for now to avoid schema changes/migration 
    // which might be risky without backup.
    
    // Parse body manually because of multipart/form-data
    const { title, description, dueDate, courseId } = req.body;
    let finalDescription = description || "";

    if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        finalDescription += `\n\n[Télécharger le fichier joint](${fileUrl})`;
    }

    if (!title || !dueDate || !courseId) {
         return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedDate = new Date(dueDate);

    if (req.user?.role === "TEACHER") {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: finalDescription || null,
        dueDate: parsedDate,
        courseId,
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating assignment", error });
  }
};

export const getAssignmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "ID required" });

    const assignment = await prisma.assignment.findUnique({
      where: { id: id as string },
      include: {
        course: {
          select: {
            id: true,
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        submissions: {
            ...(req.user?.role === 'STUDENT' ? { where: { studentId: req.user.id } } : {})
        }
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignment", error });
  }
};

export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
       return res.status(400).json({message: "courseId is required"});
    }

    const assignments = await prisma.assignment.findMany({
      where: { courseId: String(courseId) },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignments", error });
  }
};

export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    // Parse manually
    const { content } = req.body;
    let fileUrl = req.body.fileUrl;

    if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
    }

    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!id) return res.status(400).json({ message: "ID required" });

    // Check if already submitted
    const existingSubmission = await prisma.submission.findFirst({
        where: {
            assignmentId: id as string,
            studentId
        }
    })

    if (existingSubmission) {
        // Option to update instead of fail? User said "submit work", usually implies once or update.
        // For simplicity, let's allow update if it exists or create new if not (but findFirst checks existence).
        // Let's stick to "already submitted" for now or update it.
        // I will update it to be friendlier.
        const updatedSubmission = await prisma.submission.update({
            where: { id: existingSubmission.id },
            data: {
                content: content || existingSubmission.content,
                fileUrl: fileUrl || existingSubmission.fileUrl,
                submittedAt: new Date()
            }
        });
        return res.status(200).json(updatedSubmission);
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId: id as string,
        studentId,
        content: content || null,
        fileUrl: fileUrl || null,
      },
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting assignment", error });
  }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    
    if (!id) return res.status(400).json({ message: "ID required" });

    // Check ownership if teacher
    if (req.user?.role === "TEACHER") {
        const assignment = await prisma.assignment.findUnique({
            where: { id: id as string },
            include: { course: true }
        });
        if (!assignment || assignment.course.teacherId !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: id as string },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        grade: true,
      },
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching submissions", error });
  }
};

export const gradeSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // submissionId
    const { value, comment } = gradeSubmissionSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID required" });

    const submission = await prisma.submission.findUnique({
      where: { id: id as string },
      include: {
          student: true,
          assignment: true
      }
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Upsert grade
    // Note: Grade creation requires termId. We need to find the active term for this assignment.
    // For now, let's try to find an OPEN term in the school.
    // This logic is a bit fragile and should be improved by linking assignment to term or year.
    
    // Quick fix: Find the first OPEN term.
    const activeTerm = await prisma.term.findFirst({
        where: { status: 'OPEN' }
    });
    
    let termId = activeTerm?.id;

    // If no active term, try to find ANY term or create a default one if we want to enforce it.
    // For now, if schema allows null, we can skip it, OR we create a dummy one.
    // Schema allows null.
    // But let's see if we can just skip it.
    
    const grade = await prisma.grade.upsert({
      where: { submissionId: id as string },
      update: {
        value,
        comment: comment || null,
      },
      create: {
        submissionId: id as string,
        value,
        comment: comment || null,
        studentId: submission.studentId,
        termId: termId || null,
      },
    });

    res.json(grade);
  } catch (error) {
    res.status(500).json({ message: "Error grading submission", error });
  }
};
