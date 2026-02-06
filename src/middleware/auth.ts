import {auth} from "../lib/auth.js";
import {fromNodeHeaders} from "better-auth/node";
import type {Request, Response, NextFunction} from "express";
import {db} from "../db/index.js";
import {session as sessionTable, user as userTable} from "../db/schema/auth.js";
import {eq, and, gt} from "drizzle-orm";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Skip auth check for auth endpoints themselves
        if (req.path.startsWith('/api/auth')) {
            return next();
        }

        console.log(`\n--- [Auth Debug Start: ${req.path}] ---`);
        
        const cookie = req.headers.cookie;
        const authHeader = req.headers.authorization;

        const debug = process.env.NODE_ENV !== "production";
        if (debug) {
            console.debug(`[Cookie Present]: ${Boolean(cookie)}`);
            console.debug(`[Auth Header Present]: ${Boolean(authHeader)}`);
        }

        // 1. Try Better-Auth's standard session retrieval
        let effectiveHeaders = fromNodeHeaders(req.headers);
        let token: string | undefined;

        // Extract token from Bearer header if present
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            // If cookie is missing, inject it for better-auth to find
            if (!cookie?.includes('better-auth.session_token')) {
                effectiveHeaders.set('cookie', `better-auth.session_token=${token}`);
                console.log(`[Bearer Fallback] Injected token into headers for Better-Auth`);
            }
        }

        let session = await auth.api.getSession({
            headers: effectiveHeaders
        }).catch(err => {
            console.error(`[getSession Error]:`, err);
            return null;
        });

        // 2. FAIL-SAFE: If Better-Auth fails, try direct Database lookup
        // This bypasses any cookie/header parsing issues inside the library
        if (!session && token) {
            console.log(`[Fail-Safe] Better-Auth failed. Attempting direct Database lookup for bearer token.`);
            try {
                const [dbSession] = await db
                    .select({
                        session: sessionTable,
                        user: userTable
                    })
                    .from(sessionTable)
                    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
                    .where(
                        and(
                            eq(sessionTable.token, token),
                            gt(sessionTable.expiresAt, new Date())
                        )
                    )
                    .limit(1);

                if (dbSession) {
                    console.log(`[Fail-Safe SUCCESS] Found valid session in DB.`);
                    session = {
                        user: dbSession.user,
                        session: dbSession.session
                    } as any;
                } else {
                    console.log(`[Fail-Safe FAILURE] No valid/unexpired session found in DB for this token.`);
                }
            } catch (dbErr) {
                console.error(`[Fail-Safe Error] Database query failed:`, dbErr);
            }
        }

        if (session) {
            console.log(`[FINAL RESULT] SUCCESS. User role: ${session.user.role}`);
            req.user = session.user as any;
        } else {
            console.log(`[FINAL RESULT] FAILURE. No session identified.`);
        }
        console.log(`--- [Auth Debug End] ---\n`);
    } catch (error) {
        console.error("Critical error in authMiddleware:", error);
    }

    next();
};
