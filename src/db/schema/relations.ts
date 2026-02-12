import { relations } from "drizzle-orm";
import { organization } from "./organization";
import { user, session, account } from "./auth"; // ✅ Add session, account
import { 
    departments, 
    teacherDepartments, 
    subjects, 
    classes, 
    enrollments 
} from "./app";

// ✅ Organization relations
export const organizationRelations = relations(organization, ({ many }) => ({
    users: many(user),
    departments: many(departments),
    classes: many(classes),
    subjects: many(subjects),
}));

// ✅ User relations (moved from auth.ts)
export const userRelations = relations(user, ({ many, one }) => ({
    sessions: many(session),
    accounts: many(account),
    classes: many(classes), // Classes taught by teacher
    enrollments: many(enrollments), // Classes enrolled as student
    teacherDepartments: many(teacherDepartments), // Departments teacher belongs to
    organization: one(organization, {
        fields: [user.organizationId],
        references: [organization.id],
    }),
}));

// ✅ Session relations (moved from auth.ts)
export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

// ✅ Account relations (moved from auth.ts)
export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

// ✅ Department relations
export const departmentRelations = relations(departments, ({ many, one }) => ({ 
    subjects: many(subjects),
    teacherDepartments: many(teacherDepartments),
    organization: one(organization, {
        fields: [departments.organizationId],
        references: [organization.id],
    }),
}));

// ✅ Teacher-Department junction relations
export const teacherDepartmentsRelations = relations(teacherDepartments, ({ one }) => ({
    teacher: one(user, {
        fields: [teacherDepartments.teacherId],
        references: [user.id],
    }),
    department: one(departments, {
        fields: [teacherDepartments.departmentId],
        references: [departments.id],
    }),
}));

// ✅ Subject relations
export const subjectsRelations = relations(subjects, ({ one, many }) => ({
    department: one(departments, {
        fields: [subjects.departmentId],
        references: [departments.id],
    }),
    organization: one(organization, {
        fields: [subjects.organizationId],
        references: [organization.id],
    }),
    classes: many(classes)
}));

// ✅ Class relations
export const classesRelations = relations(classes, ({ one, many }) => ({
    subject: one(subjects, {
        fields: [classes.subjectId],
        references: [subjects.id],
    }),
    teacher: one(user, {
        fields: [classes.teacherId],
        references: [user.id],
    }),
    organization: one(organization, {
        fields: [classes.organizationId],
        references: [organization.id],
    }),
    enrollments: many(enrollments)
}));

// ✅ Enrollment relations
export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
    student: one(user, {
        fields: [enrollments.studentId],
        references: [user.id],
    }),
    class: one(classes, {
        fields: [enrollments.classId],
        references: [classes.id],
    }),
}));