import express from 'express';
import {and, desc, eq, getTableColumns, ilike, sql, asc} from "drizzle-orm";
import {departments} from "../db/schema/index.js";
import {db} from "../db/index.js";
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Get all departments with optional search and pagination
router.get("/", async (req, res) => {
    try {
         const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const {search, page = 1, limit = 10, sortField, sortOrder} = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                ilike(departments.name, `%${search}%`)
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        let orderByClause: any = desc(departments.createdAt);

        if (sortField && sortOrder) {
            const column = (departments as any)[sortField as string];
            if (column) {
                orderByClause = sortOrder === 'asc' ? asc(column) : desc(column);
            }
        }

        const countResult = await db
            .select({ count: sql<number>`count(*)`})
            .from(departments)
            .where(and(whereClause, eq(departments.organizationId, req.user?.organizationId!)));

        const totalCount = countResult[0]?.count ?? 0;

        const deptList = await db
            .select({
                ...getTableColumns(departments)
            })
            .from(departments)
            .where(and(whereClause, eq(departments.organizationId, organizationId)))
            .orderBy(orderByClause)
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: deptList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });

    } catch (e) {
        console.error(`Get /departments error: ${e}`);
        res.status(500).json({error: 'Failed to get departments'});
    }
});

// Get one department
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({error: 'Invalid ID'});

        const [dept] = await db
            .select()
            .from(departments)
            .where(and(eq(departments.id, id), eq(departments.organizationId, req.user?.organizationId!)));

        if (!dept) return res.status(404).json({error: 'Department not found'});

        res.status(200).json({data: dept});
    } catch (e) {
        res.status(500).json({error: 'Failed to get department'});
    }
});

// Create department
router.post("/", async (req, res) => {
    try {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ error: "Missing organizationId" });
        }

        const [newDept] = await db
            .insert(departments)
            .values({
                ...req.body,
                organizationId, // ✅ Always set from session/user
            })
            .returning();

        res.status(201).json({ data: newDept });
    } catch (e) {
        console.error('[Department Create Error]:', e); // Add this for debugging!
        res.status(500).json({ error: e });
    }
});

// Update department
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({error: 'Invalid ID'});

        const [updatedDept] = await db
            .update(departments)
            .set(req.body)
            .where(and(eq(departments.id, id), eq(departments.organizationId, req.user?.organizationId!)))
            .returning();

        if (!updatedDept) return res.status(404).json({error: 'Department not found'});

        res.status(200).json({data: updatedDept});
    } catch (e) {
        res.status(500).json({error: 'Failed to update department'});
    }
});

// Delete department
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({error: 'Invalid ID'});

        // Check for subjects first (delete constraint)
        // Drizzle schema says onDelete: 'restrict' for subjects.departmentId
        // but we can check manually for better error message.

        const [deletedDept] = await db
            .delete(departments)
            .where(and(eq(departments.id, id), eq(departments.organizationId, req.user?.organizationId!)))
            .returning();

        if (!deletedDept) return res.status(404).json({error: 'Department not found'});

        res.status(200).json({data: deletedDept});
    } catch (e: any) {
        if (e.code === '23503') {
            return res.status(400).json({message: 'Cannot delete department with existing subjects'});
        }
        res.status(500).json({error: 'Failed to delete department'});
    }
});

export default router;
