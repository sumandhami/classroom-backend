import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import * as schema from '../db/schema/auth.js'
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
            ? {
                  github: {
                      clientId: process.env.GITHUB_CLIENT_ID,
                      clientSecret: process.env.GITHUB_CLIENT_SECRET,
                  },
              }
            : {}),
    },
    // ❌ REMOVE callbacks - defaultValue handles it
    cookie: {
        namePrefix: "better-auth",
        attributes: {
           // ✅ Better cookie settings for cross-browser compatibility
           sameSite: useSecureCookies ? "none" : "lax",
           httpOnly: true,
           secure: useSecureCookies,
        //    domain: useSecureCookies ? process.env.COOKIE_DOMAIN : undefined,
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
        },
        expiresIn: 7 * 24 * 60 * 60, // 7 days
        updateAge: 24 * 60 * 60, // Update every 24 hours
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
            
            try {
                await resend.emails.send({
                    from: 'Classroom <noreply@send.classroom.sumandhami.com.np>', // ✅ Your verified domain
                    to: user.email,
                    subject: 'Verify your email address',
                    html: `
                        <h2>Welcome to Classroom!</h2>
                        <p>Please verify your email address by clicking the button below:</p>
                        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
                            Verify Email
                        </a>
                        <p>Or copy this link: ${verificationUrl}</p>
                        <p>This link will expire in 1 hour.</p>
                    `,
                });
                console.log(`✅ Verification email sent to ${user.email}`);
            } catch (error) {
                console.error('❌ Failed to send email:', error);
                throw error;
            }
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string", 
                required: true, 
                defaultValue: 'student', // ✅ This handles OAuth users automatically
                input: true,
            },
            imageCldPubId: {
                type: "string", 
                required: false, 
                input: true,
            },
        }
    }
});