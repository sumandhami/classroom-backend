import {
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    unique,
    varchar,
    index,
    primaryKey
} from "drizzle-orm/pg-core";
import { organization } from "./organization";
import { user } from "./auth";
import { timestamps } from "./utils"; // ✅ Import from utils

export const classStatusEnum = pgEnum('class_status', ['active', 'inactive', 'archived']);

export const departments = pgTable('departments', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
    code: varchar('code', {length: 50}).notNull(),
    name: varchar('name', {length: 255}).notNull(),
    description: varchar('description', {length: 255}),
    ...timestamps
}, (table) => [
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

// ✅ Keep type exports
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