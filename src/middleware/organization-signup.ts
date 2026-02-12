import type { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { organization } from "../db/schema/organization.js";
import { generateId } from "better-auth";

export const organizationSignupMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // ✅ Only intercept the sign-up endpoint
    if (req.path !== '/api/auth/sign-up/email' || req.method !== 'POST') {
        return next();
    }

    try {
        console.log("🔧 [Org Signup] Intercepting signup request");

        const body = req.body;
        const orgData = body?.organizationData;

        if (!orgData) {
            console.log("⚠️ [Org Signup] No organization data found, skipping...");
            return next();
        }

        console.log("🏢 [Org Signup] Creating organization...");

        // ✅ Create organization FIRST
        const orgId = generateId();
        const [newOrg] = await db.insert(organization).values({
            id: orgId,
            name: orgData.organizationName,
            type: orgData.organizationType,
            email: orgData.organizationEmail,
            phone: orgData.organizationPhone || null,
            address: orgData.organizationAddress || null,
            logo: orgData.organizationLogo || null,
            logoCldPubId: orgData.organizationLogoCldPubId || null,
            subscriptionStatus: 'trial',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }).returning();

        console.log("✅ [Org Signup] Organization created:", newOrg.id);

        // ✅ MODIFY the request body to include organizationId and role
        req.body = {
            email: body.email,
            password: body.password,
            name: body.name,
            role: 'admin', // Set as admin
            organizationId: orgId, // Link to organization
        };

        console.log("✅ [Org Signup] Modified request body:", req.body);

        next();
    } catch (error) {
        console.error("❌ [Org Signup] Failed to create organization:", error);
        return res.status(500).json({
            error: "Failed to create organization",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};