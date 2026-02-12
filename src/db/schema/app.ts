import {
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    unique,
    varchar,
    index,
    primaryKey
} from "drizzle-orm/pg-core";
import {relations} from "drizzle-orm";
import {user} from "./auth";
import {organization} from "./organization";

export const classStatusEnum = pgEnum('class_status', ['active', 'inactive', 'archived']);

const timestamps = {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull()
}

export const departments = pgTable('departments', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    code: varchar('code', {length: 50}).notNull(),
    name: varchar('name', {length: 255}).notNull(),
    description: varchar('description', {length: 255}),
    ...timestamps
}, (table) => [
    // Department code must be unique within organization
    unique("dept_code_org_unique").on(table.code, table.organizationId),
    index("dept_organization_id_idx").on(table.organizationId),
]);

export const teacherDepartments = pgTable('teacher_departments', {
    teacherId: text('teacher_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    departmentId: integer('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
    ...timestamps
}, (table) => [
    primaryKey({ columns: [table.teacherId, table.departmentId] }),
    index('teacher_departments_teacher_id_idx').on(table.teacherId),
    index('teacher_departments_department_id_idx').on(table.departmentId),
]);

export const subjects = pgTable('subjects', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    departmentId: integer('department_id').notNull().references(() => departments.id, { onDelete: 'restrict' }),
    organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    name: varchar('name', {length: 255}).notNull(),
    code: varchar('code', {length: 50}).notNull(),
    description: varchar('description', {length: 255}),
    ...timestamps
}, (table) => [
    unique("subject_code_org_unique").on(table.code, table.organizationId),
    index("subject_department_id_idx").on(table.departmentId),
    index("subject_organization_id_idx").on(table.organizationId),
]);

export const classes = pgTable('classes', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    teacherId: text('teacher_id').notNull().references(() => user.id, { onDelete: 'restrict' }),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: 'cascade' }),
    inviteCode: text('invite_code').notNull().unique(),
    name: varchar('name', {length: 255}).notNull(),
    bannerCldPubId: text('banner_cld_pub_id'),
    bannerUrl: text('banner_url'),
    description: text('description'),
    capacity: integer('capacity').default(50).notNull(),
    status: classStatusEnum('status').default('active').notNull(),
    schedules: jsonb('schedules').$type<any[]>().default([]).notNull(),
    ...timestamps
}, (table) => [
    index('classes_subject_id_idx').on(table.subjectId),
    index('classes_teacher_id_idx').on(table.teacherId),
    index('classes_organization_id_idx').on(table.organizationId),
]);

export const enrollments = pgTable('enrollments', {
    studentId: text('student_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    classId: integer('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
    ...timestamps
}, (table) => [
    primaryKey({ columns: [table.studentId, table.classId] }),
    index('enrollments_student_id_idx').on(table.studentId),
    index('enrollments_class_id_idx').on(table.classId),
]);

export const departmentRelations = relations(departments, ({ many, one }) => ({ 
    subjects: many(subjects),
    teacherDepartments: many(teacherDepartments), // NEW
    organization: one(organization, {
        fields: [departments.organizationId],
        references: [organization.id],
    }),
}));

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

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type TeacherDepartment = typeof teacherDepartments.$inferSelect;
export type NewTeacherDepartment = typeof teacherDepartments.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;