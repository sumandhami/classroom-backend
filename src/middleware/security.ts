import type {Request, Response, NextFunction} from "express";
import aj from "../config/arcjet.js";
import {ArcjetNodeRequest, slidingWindow} from "@arcjet/node";
import { auth } from "../lib/auth.js";

const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if(process.env.NODE_ENV === 'test') return next();

    // Skip rate limiting for non-API paths and auth endpoints
    if (!req.path.startsWith('/api') || req.path.startsWith('/api/auth')) {
        return next();
    }

    try {
        // ✅ GET USER FROM SESSION FIRST
        const session = await auth.api.getSession({ headers: req.headers });
        const userRole = session?.user?.role ?? 'guest';

        let limit: number;
        let message: string;

        switch (userRole) {
            case 'admin':
                limit = 100;
                message = 'Admin request limit exceeded (100 per minute). Slow down.';
                break;
            case 'teacher':
            case 'student':
                limit = 60;
                message = 'User request limit exceeded (60 per minute). Please wait.';
                break;
            default:
                limit = 20;
                message = 'Guest request limit exceeded (20 per minute). Please sign up for higher limits.';
                break;
        }

        const client = aj.withRule(
            slidingWindow({
                mode: "LIVE",
                interval: '1m',
                max: limit,
            })
        );

        const xff = req.headers['x-forwarded-for'];
        const forwarded = Array.isArray(xff) ? xff[0] : xff;
        const arcjetRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: { remoteAddress: forwarded?.split(',')[0].trim() || req.socket.remoteAddress || req.ip || '0.0.0.0' }
        };

        const decision = await client.protect(arcjetRequest);  // ✅ Removed the second argument

        console.log(`[Security] Arcjet decision for role ${userRole}: ${decision.conclusion}. Path: ${req.path}. Limit: ${limit}`);

        if (!decision.isAllowed()) {
            console.log(`[Security] Request DENIED. Reason:`, decision.reason ? JSON.stringify(decision.reason) : 'Unknown');  // ✅ Check if reason exists
        }

        // ✅ Add checks for decision.reason existence
        if(decision.isDenied()) {
            if (decision.reason?.isBot?.()) {
                return res.status(403).json({error: 'Forbidden', message: 'Automated requests are not allowed'});
            }

            if (decision.reason?.isShield?.()) {
                return res.status(403).json({error: 'Forbidden', message: 'Request blocked by security policy'});
            }

            if (decision.reason?.isRateLimit?.()) {
                return res.status(429).json({error: 'Too many requests', message });
            }
        }

        next();

    } catch (e) {
        console.error('[Security] Arcjet middleware error:', e);
        // Don't block the request on security middleware errors (fail open)
        next();
    }
};

export default securityMiddleware;