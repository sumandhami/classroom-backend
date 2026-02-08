import AgentAPI from "apminsight";
AgentAPI.config()

import express from 'express';
import subjectsRouter from "./routes/subject.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import enrollmentsRouter from "./routes/enrollments.js";
import dashboardRouter from "./routes/dashboard.js";
import cors from 'cors';
import securityMiddleware from "./middleware/security.js";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth.js";
import {authMiddleware} from "./middleware/auth.js";

const app = express();
const port = 8000;

const frontendUrl = process.env.FRONTEND_URL?.replace(/'/g, "");

if(!frontendUrl) throw new Error('FRONTEND_URL is not set in .env file');

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            frontendUrl,
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    exposedHeaders: ["set-cookie"]
}))

// Use a custom handler to log and pass to better-auth
const authHandler = toNodeHandler(auth);
app.all("/api/auth/*splat", async (req, res) => {
    console.log(`[AuthRoute] Request: ${req.method} ${req.path}`);
    const safeQuery =
    process.env.NODE_ENV === "production" ? Object.keys(req.query) : req.query;
    console.log(`[AuthRoute] Query params:`, safeQuery);
    
    if (req.path.startsWith('/api/auth/callback/')) {
        console.log("🎯 OAuth Callback detected!");
        console.log("🔍 Callback query params:", safeQuery);
        
        // Let Better Auth handle the callback first
        await authHandler(req, res);
        
        console.log("✅ Better Auth finished processing");
        console.log("📝 Response sent?", res.headersSent);
        
        if (!res.headersSent) {
            console.log("🔄 Attempting redirect to:", frontendUrl);
            return res.redirect(frontendUrl);
        } else {
            console.log("⚠️ Response already sent, cannot redirect");
        }
        return;
    }
    
    return authHandler(req, res);
});
app.use(express.json());

// Diagnostic route (non‑prod only)
if (process.env.NODE_ENV !== "production") {
    app.get('/api/debug/session', (req, res) => {
        res.json({
            user: req.user,
            headers: req.headers,
            cookies: req.headers.cookie,
            timestamp: new Date().toISOString()
        });
    });
}

// ✅ Auth middleware runs first to populate req.user
app.use(authMiddleware);

// ✅ Security middleware runs second to check rate limits
app.use(securityMiddleware);

// ✅ Routes defined last
app.use('/api/subjects', subjectsRouter);
app.use('/api/users', usersRouter);
app.use('/api/classes', classesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/', (req, res) => {
    res.send('Hello, welcome to the Classroom API!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});