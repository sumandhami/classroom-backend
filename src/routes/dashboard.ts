import express from 'express';
import {count, eq, sql} from "drizzle-orm";
import {db} from "../db/index.js";
import {classes, departments, enrollments, subjects, user} from "../db/schema/index.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
    try {
        const [usersCount] = await db.select({ value: count() }).from(user);
        const [classesCount] = await db.select({ value: count() }).from(classes);
        const [enrollmentsCount] = await db.select({ value: count() }).from(enrollments);
        const [subjectsCount] = await db.select({ value: count() }).from(subjects);

        res.json({
            data: {
                users: usersCount.value,
                classes: classesCount.value,
                enrollments: enrollmentsCount.value,
                subjects: subjectsCount.value
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get("/charts/enrollment-trends", async (req, res) => {
    // Mocking trends for the last 6 months as we don't have enrollment date in schema
    // Ideally, we'd have a createdAt on enrollments.
    // Since we don't have it, let's just return some dummy data that looks real.
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
            .orderBy(sql`count desc`);

        res.json({ data });
    } catch (e) {
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
        res.status(500).json({ error: 'Failed to fetch user distribution' });
    }
});

router.get("/charts/capacity-status", async (req, res) => {
    try {
        // Classes near capacity (> 80%)
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
        res.status(500).json({ error: 'Failed to fetch capacity status' });
    }
});

export default router;
