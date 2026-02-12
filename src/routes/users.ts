import express from 'express';
import {and, desc, eq, getTableColumns, ilike, or, sql, asc, count, ne} from "drizzle-orm";  // ✅ Add ne (not equal)
import {user} from "../db/schema/index.js";
import {db} from "../db/index.js";
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware); // All routes require authentication

// Get all users with optional search, filtering and pagination
router.get("/", async (req, res) => {
    try {
        const {search, role, page = 1, limit = 10, sortField, sortOrder} = req.query;
        console.log(`[GET /api/users] Query Params:`, req.query);

        // ✅ Get current user's organization
        const currentUserOrgId = req.user?.organizationId;
        
        if (!currentUserOrgId) {
            return res.status(403).json({error: 'User not associated with any organization'});
        }

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // ✅ ALWAYS filter by organization
        filterConditions.push(eq(user.organizationId, currentUserOrgId));

        // ✅ ALWAYS exclude admin role (only show teachers and students)
        filterConditions.push(ne(user.role, 'admin'));

        // if search query exists, filter by name or email
        if (search) {
            filterConditions.push(
                or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`)
                )
            );
        }

        // if role filter exists, match role exactly (teacher or student)
        if (role) {
            console.log(`[GET /api/users] Applying role filter: ${role}`);
            // ✅ Only allow filtering by teacher or student
            if (role === 'teacher' || role === 'student') {
                filterConditions.push(eq(user.role, role as any));
            }
        }

        // Combine all filters using AND
        const whereClause = and(...filterConditions);
        console.log(`[GET /api/users] filterConditions length: ${filterConditions.length}`);

        let orderByClause: any = desc(user.createdAt);

        if (sortField && sortOrder) {
            const column = (user as any)[sortField as string];
            if (column) {
                orderByClause = sortOrder === 'asc' ? asc(column) : desc(column);
            }
        }

        // Get total count
        const countResult = await db
            .select({ count: count() })
            .from(user)
            .where(whereClause);

        const totalCount = countResult[0] ? Number(countResult[0].count ?? 0) : 0;

        // Get paginated users
        const userList = await db
            .select({
                ...getTableColumns(user)
            })
            .from(user)
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limitPerPage)
            .offset(offset);

        console.log(`[GET /api/users] Found ${userList.length} users for organization ${currentUserOrgId}`);
        if (userList.length > 0) {
            console.log(`[GET /api/users] First user role: ${userList[0]?.role}`);
        }

        res.status(200).json({
            data: userList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            }
        });

    } catch (e) {
        console.error(`Get /users error: ${e}`);
        res.status(500).json({error: 'Failed to get users'});
    }
});

// Get one user
router.get("/:id", async (req, res) => {
    try {
        // ✅ Get current user's organization
        const currentUserOrgId = req.user?.organizationId;
        
        if (!currentUserOrgId) {
            return res.status(403).json({error: 'User not associated with any organization'});
        }

        const [userData] = await db
            .select()
            .from(user)
            .where(
                and(
                    eq(user.id, req.params.id),
                    eq(user.organizationId, currentUserOrgId), // ✅ Only from same org
                    ne(user.role, 'admin') // ✅ Don't allow viewing admin users
                )
            );

        if (!userData) return res.status(404).json({error: 'User not found'});

        res.status(200).json({data: userData});
    } catch (e) {
        res.status(500).json({error: 'Failed to get user'});
    }
});

// Update user
router.put("/:id", async (req, res) => {
    try {
        // ✅ Get current user's organization and role
        const currentUserOrgId = req.user?.organizationId;
        const currentUserRole = req.user?.role;
        
        if (!currentUserOrgId) {
            return res.status(403).json({error: 'User not associated with any organization'});
        }

        // ✅ Don't allow changing role to admin or updating admin users
        if (req.body.role === 'admin') {
            return res.status(403).json({error: 'Cannot set role to admin'});
        }

        // ✅ Only admins can update users
        if (currentUserRole !== 'admin') {
            return res.status(403).json({error: 'Only admins can update users'});
        }

        const [updatedUser] = await db
            .update(user)
            .set({
                ...req.body,
                organizationId: currentUserOrgId, // ✅ Prevent changing organization
            })
            .where(
                and(
                    eq(user.id, req.params.id),
                    eq(user.organizationId, currentUserOrgId), // ✅ Only from same org
                    ne(user.role, 'admin') // ✅ Don't allow updating admin users
                )
            )
            .returning();

        if (!updatedUser) return res.status(404).json({error: 'User not found'});

        res.status(200).json({data: updatedUser});
    } catch (e) {
        res.status(500).json({error: 'Failed to update user'});
    }
});

// Delete user
router.delete("/:id", async (req, res) => {
    try {
        // ✅ Get current user's organization and role
        const currentUserOrgId = req.user?.organizationId;
        const currentUserRole = req.user?.role;
        
        if (!currentUserOrgId) {
            return res.status(403).json({error: 'User not associated with any organization'});
        }

        // ✅ Only admins can delete users
        if (currentUserRole !== 'admin') {
            return res.status(403).json({error: 'Only admins can delete users'});
        }

        const [deletedUser] = await db
            .delete(user)
            .where(
                and(
                    eq(user.id, req.params.id),
                    eq(user.organizationId, currentUserOrgId), // ✅ Only from same org
                    ne(user.role, 'admin') // ✅ Don't allow deleting admin users
                )
            )
            .returning();

        if (!deletedUser) return res.status(404).json({error: 'User not found'});

        res.status(200).json({data: deletedUser});
    } catch (e: any) {
        if (e.code === '23503') {
            return res.status(400).json({message: 'Cannot delete user with active associations (classes or enrollments)'});
        }
        res.status(500).json({error: 'Failed to delete user'});
    }
});

export default router;