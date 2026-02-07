import express from 'express';
import {and, desc, eq, getTableColumns, ilike, or, sql, asc, count} from "drizzle-orm";  // ✅ Import count
import {user} from "../db/schema/index.js";
import {db} from "../db/index.js";

const router = express.Router();

// Get all users with optional search, filtering and pagination
router.get("/", async (req, res) => {
    try {
        const {search, role, page = 1, limit = 10, sortField, sortOrder} = req.query;
        console.log(`[GET /api/users] Query Params:`, req.query);

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 100);

        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // if search query exists, filter by name or email
        if (search) {
            filterConditions.push(
                or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`)
                )
            );
        }

        // if role filter exists, match role exactly
        if (role) {
            console.log(`[GET /api/users] Applying role filter: ${role}`);
            filterConditions.push(eq(user.role, role as any));
        }

        // Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;
        console.log(`[GET /api/users] filterConditions length: ${filterConditions.length}`);

        let orderByClause: any = desc(user.createdAt);

        if (sortField && sortOrder) {
            const column = (user as any)[sortField as string];
            if (column) {
                orderByClause = sortOrder === 'asc' ? asc(column) : desc(column);
            }
        }

        // ✅ Use drizzle's count() instead of sql
        const countResult = await db
            .select({ count: count() })
            .from(user)
            .where(whereClause);

        const totalCount = Number(countResult[0]?.count ?? 0);  // ✅ Safe access with optional chaining

        const userList = await db
            .select({
                ...getTableColumns(user)
            })
            .from(user)
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limitPerPage)
            .offset(offset);

        console.log(`[GET /api/users] Found ${userList.length} users`);
        if (userList.length > 0) {
            console.log(`[GET /api/users] First user role: ${userList[0].role}`);
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
        const [userData] = await db
            .select()
            .from(user)
            .where(eq(user.id, req.params.id));

        if (!userData) return res.status(404).json({error: 'User not found'});

        res.status(200).json({data: userData});
    } catch (e) {
        res.status(500).json({error: 'Failed to get user'});
    }
});

// Update user
router.put("/:id", async (req, res) => {
    try {
        const [updatedUser] = await db
            .update(user)
            .set(req.body)
            .where(eq(user.id, req.params.id))
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
        const [deletedUser] = await db
            .delete(user)
            .where(eq(user.id, req.params.id))
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