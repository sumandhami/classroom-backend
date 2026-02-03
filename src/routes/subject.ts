import express from 'express';

import {and, desc, eq, getTableColumns, ilike, or, sql} from "drizzle-orm";
import {departments, subjects} from "../db/schema/index.js";
import { db} from "../db/index.js";

const router = express.Router();

//Get all subjects with optional search, filtering and pagination

router.get("/", async (req, res) => {
    try{
        const {search, department, page = 1, limit = 10} = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        //if search query exists, filter by name or code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            );
        }

        //if department filter exists, match department name
        if (department) {
            const deptPattern = `%${String(department).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(departments.name, deptPattern));
        }

        //Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)`})
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        const subjectList = await db
            .select({
                ...getTableColumns(subjects),
                department: { ...getTableColumns(departments)}
            }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: subjectList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        })

    } catch(e) {
        console.error(`Get /subjects error: ${e}`);
        res.status(500).json({error: 'Failed to get subjects'});
    }
})

//Get one subject
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({error: 'Invalid ID'});

        const [subject] = await db
            .select({
                ...getTableColumns(subjects),
                department: { ...getTableColumns(departments)}
            })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(eq(subjects.id, id));

        if (!subject) return res.status(404).json({error: 'Subject not found'});

        res.status(200).json({data: subject});
    } catch (e) {
        res.status(500).json({error: 'Failed to get subject'});
    }
});

// Create subject
router.post("/", async (req, res) => {
    try {
        const [newSubject] = await db
            .insert(subjects)
            .values(req.body)
            .returning();
        res.status(201).json({data: newSubject});
    } catch (e) {
        res.status(500).json({error: 'Failed to create subject'});
    }
});

// Update subject
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({error: 'Invalid ID'});

        const [updatedSubject] = await db
            .update(subjects)
            .set(req.body)
            .where(eq(subjects.id, id))
            .returning();

        if (!updatedSubject) return res.status(404).json({error: 'Subject not found'});

        res.status(200).json({data: updatedSubject});
    } catch (e) {
        res.status(500).json({error: 'Failed to update subject'});
    }
});

// Delete subject
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({error: 'Invalid ID'});

        const [deletedSubject] = await db
            .delete(subjects)
            .where(eq(subjects.id, id))
            .returning();

        if (!deletedSubject) return res.status(404).json({error: 'Subject not found'});

        res.status(200).json({data: deletedSubject});
    } catch (e: any) {
        if (e.code === '23503') {
            return res.status(400).json({message: 'Cannot delete subject with existing classes'});
        }
        res.status(500).json({error: 'Failed to delete subject'});
    }
});

export default router;