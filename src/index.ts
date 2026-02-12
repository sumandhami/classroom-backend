import AgentAPI from "apminsight";
AgentAPI.config()

import express from 'express';
import subjectsRouter from "./routes/subject.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import enrollmentsRouter from "./routes/enrollments.js";
import dashboardRouter from "./routes/dashboard.js";
import organizationRouter from "./routes/organization.js";
import cors from 'cors';
import securityMiddleware from "./middleware/security.js";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth.js";
import {authMiddleware} from "./middleware/auth.js";
import { organizationSignupMiddleware } from "./middleware/organization-signup.js";

const app = express();
const port = 8000;

const frontendUrl = process.env.FRONTEND_URL?.replace(/'/g, "");

if(!frontendUrl) throw new Error('FRONTEND_URL is not set in .env file');

// ✅ 1. CORS first
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

// ✅ 3. Organization signup middleware (intercepts /api/auth/sign-up/email)
app.use(organizationSignupMiddleware);

// ✅ 4. Better Auth handler
const authHandler = toNodeHandler(auth);
app.all("/api/auth/*splat", async (req, res) => {
    console.log(`[AuthRoute] Request: ${req.method} ${req.path}`);
    console.log(`[AuthRoute] Query params:`, req.query);
    
    if (req.path.startsWith('/api/auth/callback/')) {
        console.log("🎯 OAuth Callback detected!");
        console.log("🔍 State from query:", req.query.state);
        
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

// ✅ 5. Auth middleware (for session checking on other routes)
app.use(authMiddleware);

// ✅ 6. Security middleware (rate limiting based on user role)
app.use(securityMiddleware);

// ✅ 7. Application routes
app.use('/api/subjects', subjectsRouter);
app.use('/api/users', usersRouter);
app.use('/api/classes', classesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/organization', organizationRouter);

app.get('/', (req, res) => {
    res.send('Hello, welcome to the Classroom API!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});