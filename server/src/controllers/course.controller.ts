import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToSupabase } from "../utils/supabase.js";

const createCourseSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
  coefficient: z.number().optional().default(1),
});

const createMaterialSchema = z.object({
  title: z.string(),
  type: z.string(),
  url: z.string(),
});

export const getLibrary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const schoolId = req.user?.schoolId;

    if (!userId || !role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let materials;

    const includeRelation = {
        course: {
            include: {
                class: true,
                subject: true,
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        }
    };

    if (role === "TEACHER") {
      materials = await prisma.material.findMany({
        where: {
            course: {
                teacherId: userId
            }
        },
        include: includeRelation.course.include ? includeRelation : undefined,
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === "STUDENT") {
      // Logic MVP: Access by Level
      // 1. Get student's enrollments to find their level(s)
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: userId },
        include: { class: true }
      });
      
      const levels = [...new Set(enrollments.map(e => e.class.level).filter(l => l !== null))];
      const enrolledClassIds = enrollments.map(e => e.classId);

      materials = await prisma.material.findMany({
        where: {
          course: {
            class: {
              OR: [
                // Option 1: Direct enrollment (Legacy/Fallback)
                { id: { in: enrolledClassIds } },
                // Option 2: Same level in same school
                {
                   level: { in: levels as string[] },
                   schoolId: schoolId // Ensure same school
                }
              ]
            },
          },
        },
        include: includeRelation.course.include ? includeRelation : undefined,
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === "SCHOOL_ADMIN" || role === "IT_ADMIN") {
         if (!schoolId) return res.status(400).json({message: "No school ID"});
         materials = await prisma.material.findMany({
            where: {
                course: {
                    class: {
                        schoolId: schoolId
                    }
                }
            },
            include: includeRelation.course.include ? includeRelation : undefined,
            orderBy: { createdAt: 'desc' }
         });
    } else {
        // Super Admin
        materials = await prisma.material.findMany({
            include: includeRelation.course.include ? includeRelation : undefined,
            orderBy: { createdAt: 'desc' }
        });
    }

    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: "Error fetching library", error });
  }
};

export const getCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!id) return res.status(400).json({ message: "ID required" });

    const course = await prisma.course.findUnique({
      where: { id: String(id) },
      include: {
        class: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Access control
    if (role === 'TEACHER' && course.teacherId !== userId) {
        // Allow if teacher teaches this course
        // Already checked by id? No, ensure teacher owns it.
        // Actually, maybe allow viewing if they are in same school? 
        // For now, strict: only own courses.
        return res.status(403).json({ message: "Access denied" });
    }
    
    if (role === 'STUDENT') {
        // Check enrollment
        const enrollment = await prisma.enrollment.findFirst({
            where: {
                studentId: userId,
                classId: course.classId
            }
        });
        if (!enrollment) return res.status(403).json({ message: "Not enrolled in this class" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course", error });
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId, teacherId, coefficient } = createCourseSchema.parse(req.body);

    // If the user is a teacher, force the teacherId to be their own ID
    let finalTeacherId = teacherId;
    if (req.user?.role === 'TEACHER') {
        finalTeacherId = req.user.id;
    }

    const course = await prisma.course.create({
      data: {
        classId,
        subjectId,
        teacherId: finalTeacherId,
        coefficient,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: "Error creating course", error });
  }
};

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const schoolId = req.user?.schoolId;

    if (!userId || !role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let courses;

    if (role === "TEACHER") {
      courses = await prisma.course.findMany({
        where: { teacherId: userId },
        include: {
          class: true,
          subject: true,
          teacher: {
             select: {
                id: true,
                firstName: true,
                lastName: true
             }
          }
        },
      });
    } else if (role === "STUDENT") {
      // Log for debugging
      console.log(`Fetching courses for student ${userId}`);
      courses = await prisma.course.findMany({
        where: {
          class: {
            enrollments: {
              some: {
                studentId: userId,
              },
            },
          },
        },
        include: {
          class: true, // Include class info for students too
          subject: true,
          teacher: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      console.log(`Found ${courses.length} courses for student ${userId}`);
    } else if (role === "SCHOOL_ADMIN") {
        if (!schoolId) {
             return res.status(400).json({ message: "School ID not found for admin" });
        }
        courses = await prisma.course.findMany({
            where: {
                class: {
                    schoolId: schoolId
                }
            },
            include: {
                class: true,
                subject: true,
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        })
    } else {
        // Super admin or others
        courses = await prisma.course.findMany();
    }

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

export const createChapter = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title } = req.body;

    if (!courseId || !title) return res.status(400).json({ message: "Course ID and Title required" });

    // Verify ownership
    if (req.user?.role === "TEACHER") {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const chapter = await prisma.chapter.create({
      data: {
        title,
        courseId
      }
    });

    res.status(201).json(chapter);
  } catch (error) {
    res.status(500).json({ message: "Error creating chapter", error });
  }
};

export const getCourseChapters = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // courseId
        if (!id) return res.status(400).json({ message: "ID required" });

        // Get chapters with materials
        const chapters = await prisma.chapter.findMany({
            where: { courseId: String(id) },
            include: {
                materials: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Get orphans materials (no chapter)
        const orphanMaterials = await prisma.material.findMany({
            where: { 
                courseId: String(id),
                chapterId: null
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ chapters, orphanMaterials });
    } catch (error) {
        res.status(500).json({ message: "Error fetching course content", error });
    }
};

export const addMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // courseId
    // If file uploaded, url comes from file path
    let { title, type, url, source, chapterId } = req.body;

    if (req.file) {
        const publicUrl = await uploadToSupabase(req.file);
        if (publicUrl) {
            url = publicUrl;
        } else {
             return res.status(500).json({ message: "Failed to upload file" });
        }
        
        // If type not provided, deduce from mime type roughly or default to PDF
        if (!type) {
            if (req.file.mimetype.includes('video')) type = 'VIDEO';
            else type = 'PDF';
        }
    } else {
        // Validation for manual URL (if schema check is strict)
        // const { title, type, url } = createMaterialSchema.parse(req.body);
    }

    if (!title || !type || !url) {
        return res.status(400).json({ message: "Title, type and file/url are required" });
    }

    if (!id) return res.status(400).json({ message: "ID required" });

    // Verify teacher owns the course
    if (req.user?.role === "TEACHER") {
      const course = await prisma.course.findUnique({ where: { id: id as string } });
      if (!course || course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const material = await prisma.material.create({
      data: {
        title,
        type,
        url,
        source: source || null,
        chapterId: chapterId || null,
        courseId: id as string,
      },
    });

    res.status(201).json(material);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding material", error });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // materialId

    if (!id) return res.status(400).json({ message: "ID required" });

    const material = await prisma.material.findUnique({
      where: { id: id as string },
      include: { course: true }
    });

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Verify teacher owns the course
    if (req.user?.role === "TEACHER") {
      if (material.course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    await prisma.material.delete({
      where: { id: id as string },
    });

    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting material", error });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "ID required" });

    const course = await prisma.course.findUnique({
      where: { id: id as string },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Verify permission (Teacher must own the course, or be Admin)
    if (req.user?.role === "TEACHER") {
      if (course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "SCHOOL_ADMIN") {
        return res.status(403).json({ message: "Access denied" });
    }

    await prisma.course.delete({
      where: { id: id as string },
    });

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting course", error });
  }
};

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // courseId
    
    if (!id) return res.status(400).json({ message: "ID required" });

    const materials = await prisma.material.findMany({
      where: { courseId: id as string },
      orderBy: { createdAt: "desc" },
    });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: "Error fetching materials", error });
  }
};
