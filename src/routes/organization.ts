import express from 'express';
import { db } from '../db/index.js';
import { organization } from '../db/schema/organization.js';
import { user, account, verification } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { hash } from '@node-rs/argon2';
import { Resend } from 'resend';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
router.use(authMiddleware); // All routes require authentication

// Register new organization with admin user
// router.post('/register', async (req, res) => {
//     try {
//         const {
//             organizationName,
//             organizationType,
//             organizationEmail,
//             organizationPhone,
//             organizationAddress,
//             adminName,
//             adminEmail,
//             adminPassword
//         } = req.body;

//         // Validation
//         if (!organizationName || !organizationType || !organizationEmail || !adminName || !adminEmail || !adminPassword) {
//             return res.status(400).json({ error: 'Missing required fields' });
//         }

//         if (!['school', 'college', 'university', 'coaching'].includes(organizationType)) {
//             return res.status(400).json({ error: 'Invalid organization type' });
//         }

//         if (adminPassword.length < 8) {
//             return res.status(400).json({ error: 'Password must be at least 8 characters' });
//         }

//         // Check if organization email exists
//         const [existingOrg] = await db
//             .select()
//             .from(organization)
//             .where(eq(organization.email, organizationEmail))
//             .limit(1);

//         if (existingOrg) {
//             return res.status(400).json({ error: 'Organization email already exists' });
//         }

//         // Check if admin email exists
//         const [existingUser] = await db
//             .select()
//             .from(user)
//             .where(eq(user.email, adminEmail))
//             .limit(1);

//         if (existingUser) {
//             return res.status(400).json({ error: 'Admin email already in use' });
//         }

//         // Create organization
//         const orgId = generateId();
//         const [newOrg] = await db.insert(organization).values({
//             id: orgId,
//             name: organizationName,
//             type: organizationType,
//             email: organizationEmail,
//             phone: organizationPhone || null,
//             address: organizationAddress || null,
//             subscriptionStatus: 'trial',
//             subscriptionStartDate: new Date(),
//             subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
//         }).returning();

//         // Create admin user
//         const userId = generateId();
//         const hashedPassword = await hash(adminPassword);
        
//         const [newUser] = await db.insert(user).values({
//             id: userId,
//             name: adminName,
//             email: adminEmail,
//             emailVerified: false,
//             role: 'admin',
//             organizationId: orgId,
//         }).returning();

//         // Create account with password
//         await db.insert(account).values({
//             id: generateId(),
//             accountId: userId,
//             providerId: 'credential',
//             userId: userId,
//             password: hashedPassword,
//         });

//         // ✅ Generate verification token
//         const verificationToken = generateId();
//         const verificationTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

//         await db.insert(verification).values({
//             id: generateId(),
//             identifier: adminEmail,
//             value: verificationToken,
//             expiresAt: verificationTokenExpiresAt,
//         });

//         // ✅ Send verification email
//         const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        
//         try {
//             await resend.emails.send({
//                 from: 'Classroom <noreply@send.classroom.sumandhami.com.np>',
//                 to: adminEmail,
//                 subject: 'Verify your organization account',
//                 html: `
//                     <h2>Welcome to Classroom!</h2>
//                     <p>Your organization <strong>${organizationName}</strong> has been registered successfully.</p>
//                     <p>Please verify your email address to activate your admin account:</p>
//                     <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
//                         Verify Email
//                     </a>
//                     <p>Or copy this link: ${verificationUrl}</p>
//                     <p><strong>Trial Period:</strong> Your organization is on a 30-day trial until ${newOrg?.subscriptionEndDate?.toLocaleDateString()}</p>
//                     <p>This verification link expires in 1 hour.</p>
//                 `,
//             });
//             console.log(`✅ Verification email sent to ${adminEmail}`);
//         } catch (emailError) {
//             console.error('❌ Failed to send verification email:', emailError);
//             // Don't fail the registration if email fails
//         }

//         console.log(`✅ Organization registered: ${organizationName} (${orgId})`);
//         console.log(`✅ Admin user created: ${adminEmail} (${userId})`);

//         res.status(201).json({
//             message: 'Organization registered successfully! Please check your email to verify your account.',
//             data: {
//                 organizationId: orgId,
//                 organizationName: newOrg?.name,
//                 adminEmail: newUser?.email,
//                 subscriptionStatus: newOrg?.subscriptionStatus,
//                 trialEndsAt: newOrg?.subscriptionEndDate,
//             }
//         });

//     } catch (e) {
//         console.error('Organization registration error:', e);
//         res.status(500).json({ error: 'Failed to register organization' });
//     }
// });

// Get organization details (for authenticated admins)
router.get('/:id', async (req, res) => {
    try {
               if (req.user?.organizationId !== req.params.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const [org] = await db
            .select()
            .from(organization)
            .where(eq(organization.id, req.params.id));

        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.status(200).json({ data: org });
    } catch (e) {
        console.error('Get organization error:', e);
        res.status(500).json({ error: 'Failed to get organization' });
    }
});

export default router;