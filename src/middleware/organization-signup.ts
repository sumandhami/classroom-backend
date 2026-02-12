import type { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { organization } from "../db/schema/organization.js";
import { generateId } from "better-auth";
import { z } from "zod";

// ✅ Zod schema for organization data validation
const organizationSignUpSchema = z.object({
    organizationName: z.string().min(1).max(255).trim(),
    organizationType: z.enum(["school", "college", "university", "coaching"], {
        message: "Please select organization type"
    }),
    organizationEmail: z.string().min(1).email().toLowerCase().trim(),
    organizationPhone: z.string().trim().optional().or(z.literal("")),
    organizationAddress: z.string().trim().optional().or(z.literal("")),
    organizationLogo: z.string().url().optional().or(z.literal("")),
    organizationLogoCldPubId: z.string().optional().or(z.literal("")),
    adminName: z.string().min(2).max(255).trim(),
    adminEmail: z.string().min(1).email().toLowerCase().trim(),
    adminPassword: z.string().min(8)
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1),
}).refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});


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

        // ✅ Validate organization data with Zod
        const validation = organizationSignUpSchema.safeParse(orgData);
        
        if (!validation.success) {
    console.log("❌ [Org Signup] Validation failed:", validation.error.issues);
    return res.status(400).json({
        error: "Invalid organization data",
        details: validation.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
        })),
    });
}

        const validatedData = validation.data;
        console.log("✅ [Org Signup] Validation passed");
        console.log("🏢 [Org Signup] Creating organization...");

        // ✅ Create organization FIRST with validated data
        const orgId = generateId();
        const [newOrg] = await db.insert(organization).values({
            id: orgId,
            name: validatedData.organizationName,
            type: validatedData.organizationType,
            email: validatedData.organizationEmail,
            phone: validatedData.organizationPhone || null,
            address: validatedData.organizationAddress || null,
            logo: validatedData.organizationLogo || null,
            logoCldPubId: validatedData.organizationLogoCldPubId || null,
            subscriptionStatus: 'trial',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }).returning();

        console.log("✅ [Org Signup] Organization created:", newOrg?.id);

        // ✅ MODIFY the request body to include organizationId and role
        req.body = {
            email: body.email,
            password: body.password,
            name: body.name,
            role: 'admin', // Set as admin
            organizationId: orgId, // Link to organization
        };

        console.log("✅ [Org Signup] Modified request body:", req.body.email);

        next();
    } catch (error) {
        console.error("❌ [Org Signup] Failed to create organization:", error);
        
        // ✅ Handle unique constraint violations specifically
        if (error instanceof Error && error.message.includes('unique constraint')) {
            return res.status(409).json({
                error: "Organization with this email already exists",
            });
        }

        // ✅ Handle other database errors
        if (error instanceof Error && error.message.includes('violates')) {
            return res.status(400).json({
                error: "Invalid data",
                message: error.message,
            });
        }

        return res.status(500).json({
            error: "Failed to create organization",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};