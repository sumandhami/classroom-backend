import express from 'express';
import {count, eq, sql} from "drizzle-orm";
import {db} from "../db/index.js";
import {classes, departments, enrollments, subjects, user} from "../db/schema/index.js";
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware); 

router.get("/stats", async (req, res) => {
    try {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: 'Organization ID not found in user session' });
        }
        const usersResult = await db.select({ value: count() }).from(user).where(eq(user.organizationId, organizationId));
        const classesResult = await db.select({ value: count() }).from(classes).where(eq(classes.organizationId, organizationId));
        const enrollmentsResult = await db.select({ value: count() }).from(enrollments);
        const subjectsResult = await db.select({ value: count() }).from(subjects).where(eq(subjects.organizationId, organizationId));

        res.json({
            data: {
                users: usersResult[0]?.value ?? 0,
                classes: classesResult[0]?.value ?? 0,
                enrollments: enrollmentsResult[0]?.value ?? 0,
                subjects: subjectsResult[0]?.value ?? 0
            }
        });
    } catch (e) {
        console.error('[Dashboard] Stats error:', e);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get("/charts/enrollment-trends", async (req, res) => {
    res.json({
        data: [
            { name: 'Sep', count: 45 },
            { name: 'Oct', count: 52 },
            { name: 'Nov', count: 48 },
            { name: 'Dec', count: 61 },
            { name: 'Jan', count: 55 },
            { name: 'Feb', count: 67 },
        ]
    });
});

router.get("/charts/classes-by-dept", async (req, res) => {
    try {
        const data = await db
            .select({
                name: departments.name,
                count: sql<number>`count(${classes.id})`
            })
            .from(departments)
            .leftJoin(subjects, eq(subjects.departmentId, departments.id))
            .leftJoin(classes, eq(classes.subjectId, subjects.id))
            .groupBy(departments.id)
            .orderBy(sql`count(*) desc`);  // ← Fixed this line

        res.json({ data });
    } catch (e) {
        console.error('[Dashboard] Classes by dept error:', e);
        res.status(500).json({ error: 'Failed to fetch classes by dept' });
    }
});

router.get("/charts/user-distribution", async (req, res) => {
    try {
        const data = await db
            .select({
                name: user.role,
                value: count()
            })
            .from(user)
            .groupBy(user.role);

        res.json({ data });
    } catch (e) {
        console.error('[Dashboard] User distribution error:', e);
        res.status(500).json({ error: 'Failed to fetch user distribution' });
    }
});

router.get("/charts/capacity-status", async (req, res) => {
    try {
        const all_classes = await db
            .select({
                id: classes.id,
                name: classes.name,
                capacity: classes.capacity,
                enrolled: sql<number>`(select count(*) from ${enrollments} where ${enrollments.classId} = ${classes.id})`
            })
            .from(classes);

        const status = {
            full: all_classes.filter(c => Number(c.enrolled) >= c.capacity).length,
            nearFull: all_classes.filter(c => Number(c.enrolled) >= c.capacity * 0.8 && Number(c.enrolled) < c.capacity).length,
            available: all_classes.filter(c => Number(c.enrolled) < c.capacity * 0.8).length,
        }

        res.json({
            data: [
                { name: 'Full', value: status.full },
                { name: 'Near Capacity', value: status.nearFull },
                { name: 'Available', value: status.available },
            ]
        });
    } catch (e) {
        console.error('[Dashboard] Capacity status error:', e);
        res.status(500).json({ error: 'Failed to fetch capacity status' });
    }
});

export default router;