import type { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const saveGradeSchema = z.object({
  studentId: z.string(),
  assignmentId: z.string(),
  value: z.number().min(0).max(20),
  comment: z.string().optional(),
});

export const getGradebook = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ message: "Course ID required" });
    }

    // Verify access
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { class: true }
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (req.user?.role === "TEACHER" && course.teacherId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get Students
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: course.classId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { student: { lastName: 'asc' } }
    });

    const students = enrollments.map(e => e.student);

    // Get Assignments
    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { dueDate: 'asc' }
    });

    // Get Grades
    const grades = await prisma.grade.findMany({
      where: {
        assignment: {
          courseId
        }
      }
    });

    res.json({
      students,
      assignments,
      grades
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching gradebook", error });
  }
};

export const saveGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, assignmentId, value, comment } = saveGradeSchema.parse(req.body);

    // Check if assignment belongs to teacher's course
    if (req.user?.role === "TEACHER") {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: true }
      });
      
      if (!assignment || assignment.course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Find active term
    const activeTerm = await prisma.term.findFirst({
        where: { status: 'OPEN' }
    });

    // Check if a submission exists (optional, but good to link if present)
    const submission = await prisma.submission.findFirst({
        where: { assignmentId, studentId }
    });

    // Proper implementation without upsert on non-unique fields
    const existingGrade = await prisma.grade.findFirst({
        where: {
            studentId,
            assignmentId
        }
    });

    let result;
    if (existingGrade) {
        result = await prisma.grade.update({
            where: { id: existingGrade.id },
            data: {
                value,
                comment: comment || null
            }
        });
    } else {
        result = await prisma.grade.create({
            data: {
                studentId,
                assignmentId,
                value,
                comment: comment || null,
                termId: activeTerm?.id || null,
                submissionId: submission?.id || null
            }
        });
    }

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving grade", error });
  }
};

export const getStudentReportCard = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.params.studentId || req.user?.id;
    const { termId } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: "Student ID required" });
    }

    // Check permissions
    if (req.user?.role === "STUDENT" && req.user.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
    }

    // Fetch Student Info
    const student = await prisma.user.findUnique({
        where: { id: studentId as string },
        include: {
            school: true,
            enrollments: {
                include: {
                    class: true
                },
                orderBy: { joinedAt: 'desc' },
                take: 1
            }
        }
    });

    if (!student) {
        return res.status(404).json({ message: "Student not found" });
    }

    // Determine Term
    let term;
    if (termId) {
        term = await prisma.term.findUnique({ where: { id: termId as string } });
    } else {
        // Find active term or latest term
        if (student.schoolId) {
            term = await prisma.term.findFirst({
                where: {
                    academicYear: {
                        schoolId: student.schoolId
                    },
                    status: 'OPEN'
                }
            });
            // If no open term, find the most recent one
            if (!term) {
                term = await prisma.term.findFirst({
                    where: {
                        academicYear: {
                            schoolId: student.schoolId
                        }
                    },
                    orderBy: { endDate: 'desc' }
                });
            }
        }
    }

    if (!term) {
        return res.status(404).json({ message: "No term found" });
    }

    // Get Courses for the student's class
    const enrollment = student.enrollments[0];
    if (!enrollment) {
         return res.status(400).json({ message: "Student not enrolled in any class" });
    }

    const courses = await prisma.course.findMany({
        where: { classId: enrollment.classId },
        include: {
            subject: true,
            teacher: {
                select: { firstName: true, lastName: true }
            }
        }
    });

    // Get Grades for this student in this term
    const grades = await prisma.grade.findMany({
        where: {
            studentId: studentId as string,
            termId: term.id
        },
        include: {
            assignment: true
        }
    });

    // Calculate Averages per Subject
    const subjectStats = courses.map(course => {
        const courseGrades = grades.filter(g => g.assignment?.courseId === course.id);
        
        const sum = courseGrades.reduce((acc, g) => acc + g.value, 0);
        const count = courseGrades.length;
        const average = count > 0 ? sum / count : null;
        
        return {
            id: course.subject.id,
            subject: course.subject.name,
            subjectCode: course.subject.code,
            teacher: `${course.teacher.firstName} ${course.teacher.lastName}`,
            average: average,
            grades: courseGrades.map(g => ({
                value: g.value,
                assignment: g.assignment?.title
            }))
        };
    });

    // Calculate Overall Average
    const validSubjects = subjectStats.filter(s => s.average !== null);
    const overallSum = validSubjects.reduce((acc, s) => acc + (s.average || 0), 0);
    const overallAverage = validSubjects.length > 0 ? overallSum / validSubjects.length : null;

    res.json({
        student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            class: enrollment.class.name
        },
        school: student.school,
        term: term,
        subjects: subjectStats,
        overallAverage
    });

  } catch (error) {
    console.error("Error generating report card", error);
    res.status(500).json({ message: "Error generating report card" });
  }
};
