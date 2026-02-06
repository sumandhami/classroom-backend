import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from '../db/schema/auth.js'

const useSecureCookies = process.env.NODE_ENV === "production";
const frontendOrigin = process.env.FRONTEND_URL?.replace(/'/g, "");

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:8000",
    advanced: {
        useSecureCookies,
    },
    cookie: {
        namePrefix: "better-auth",
        attributes: {
            sameSite: "Lax",
            httpOnly: true,
            secure: useSecureCookies,
        },
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    plugins: [
        {
            id: "bearer",
            endpoints: {},
            onRequest: async (request) => {
                const authHeader = request.headers.get("Authorization");
                if (authHeader?.startsWith("Bearer ")) {
                    const token = authHeader.split(" ")[1];
                    request.headers.set("cookie", `better-auth.session_token=${token}`);
                }
                return { request };
            },
        }
    ],
    trustedOrigins: [frontendOrigin, "http://localhost:5173", "http://127.0.0.1:5173"].filter(Boolean) as string[],
    basePath: "/api/auth",
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5 minutes
        }
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
            if (process.env.NODE_ENV !== "production") {
                                console.debug(`Sending verification email to ${user.email}: ${verificationUrl}`);
                            }
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string", required: true, default: 'student', input: true,
            },
            imageCldPubId: {
                type: "string", required: false, input: true,
            },
        }
    }
});