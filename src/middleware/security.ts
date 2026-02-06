import type {Request, Response, NextFunction} from "express";
import aj from "../config/arcjet.js";
import {ArcjetNodeRequest, slidingWindow} from "@arcjet/node";

const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if(process.env.NODE_ENV === 'test') return next();

    // Skip rate limiting for auth-related paths if needed, 
    // but better-auth has its own protections.
    // However, we should definitely skip for static assets or if it's not an API call.
    if (!req.path.startsWith('/api') || req.path.startsWith('/api/auth')) {
        return next();
    }

    try {
        /*
        const role: RateLimitRole = req.user?.role ?? 'guest';
        ...
        */
        return next();

        const role: RateLimitRole = req.user?.role ?? 'guest';

        let limit: number;
        let message: string;

        switch (role) {
            case 'admin':
                limit = 50;
                message = 'Admin request limit exceed (50 per minute). Slow down.';
                break;
            case 'teacher':
            case 'student':
                limit = 30;
                message = 'User request limit exceed (30 per minute). Please wait';
                break;
            default:
                limit = 10;
                message = 'Guest request limit exceed (10 per minute). Please sign up for higher limits';
                break;
        }

        const client = aj.withRule(
            slidingWindow({
                mode: "LIVE",
                interval: '1m',
                max: limit,
            })
        )

        const arcjetRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: { remoteAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.socket.remoteAddress ?? req.ip ?? '0.0.0.0'}
        }

        const decision = await client.protect(arcjetRequest, {
            requested: 1,
        });

        console.log(`[Security] Arcjet decision for role ${role}: ${decision.conclusion}. Path: ${req.path}. Limit: ${limit}`);
        
        if (!decision.isAllowed()) {
            console.log(`[Security] Request DENIED. Reason:`, JSON.stringify(decision.reason));
        }

        if(decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({error: 'Forbidden', message: 'Automated requests are not allowed'});
        }

        if(decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({error: 'Forbidden', message: 'Request blocked by security policy'});
        }

        if(decision.isDenied() && decision.reason.isRateLimit()) {
            return res.status(429).json({error: 'Too many requests', message });
        }

        next();

    } catch (e) {
        console.error('Arcjet middleware error', e);
        res.status(500).json({error: 'Internal error', message: 'Something went wrong with security middleware'});
    }
}

export default securityMiddleware;