import express from 'express';
import {and, eq, getTableColumns, sql} from "drizzle-orm";
import {enrollments, classes} from "../db/schema/index.js";
import {user} from "../db/schema/index.js";
import {db} from "../db/index.js";

const router = express.Router();

// Get enrollments for a class
router.get("/class/:classId", async (req, res) => {
    try {
        const classId = parseInt(req.params.classId);
        if (isNaN(classId)) return res.status(400).json({error: 'Invalid Class ID'});

        const enrolledStudents = await db
            .select({
                ...getTableColumns(user)
            })
            .from(enrollments)
            .innerJoin(user, eq(enrollments.studentId, user.id))
            .where(eq(enrollments.classId, classId));

        res.status(200).json({data: enrolledStudents});
    } catch (e) {
        res.status(500).json({error: 'Failed to get enrollments'});
    }
});

// Enroll a student
router.post("/", async (req, res) => {
    try {
        const {studentId, classId} = req.body;

        // Check capacity
        const [targetClass] = await db
            .select()
            .from(classes)
            .where(eq(classes.id, classId));

        if (!targetClass) return res.status(404).json({error: 'Class not found'});

        const [{count}] = await db
            .select({count: sql`count(*)`})
            .from(enrollments)
            .where(eq(enrollments.classId, classId));

        if (Number(count) >= targetClass.capacity) {
            return res.status(400).json({message: 'Class is full'});
        }

        const [newEnrollment] = await db
            .insert(enrollments)
            .values({studentId, classId})
            .returning();

        res.status(201).json({data: newEnrollment});
    } catch (e: any) {
        if (e.code === '23505') {
            return res.status(400).json({message: 'Student already enrolled'});
        }
        res.status(500).json({error: 'Failed to enroll student'});
    }
});

// Unenroll a student
router.delete("/", async (req, res) => {
    try {
        const {studentId, classId} = req.query;
        if (!studentId || !classId) return res.status(400).json({error: 'Missing studentId or classId'});

        await db
            .delete(enrollments)
            .where(
                and(
                    eq(enrollments.studentId, String(studentId)),
                    eq(enrollments.classId, parseInt(String(classId)))
                )
            );

        res.status(200).json({message: 'Unenrolled successfully'});
    } catch (e) {
        res.status(500).json({error: 'Failed to unenroll student'});
    }
});

export default router;
