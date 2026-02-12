CREATE TYPE "public"."class_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'teacher', 'admin');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('school', 'college', 'university', 'coaching');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'inactive', 'trial', 'expired');--> statement-breakpoint
CREATE TABLE "classes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "classes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"teacher_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"invite_code" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"banner_cld_pub_id" text,
	"banner_url" text,
	"description" text,
	"capacity" integer DEFAULT 50 NOT NULL,
	"status" "class_status" DEFAULT 'active' NOT NULL,
	"schedules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classes_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "departments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" text NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dept_code_org_unique" UNIQUE("code","organization_id")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"student_id" text NOT NULL,
	"class_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_student_id_class_id_pk" PRIMARY KEY("student_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subjects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"department_id" integer NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subject_code_org_unique" UNIQUE("code","organization_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_departments" (
	"teacher_id" text NOT NULL,
	"department_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_departments_teacher_id_department_id_pk" PRIMARY KEY("teacher_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "account_provider_account_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'student' NOT NULL,
	"image_cld_pub_id" text,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "organization_type" NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"logo" text,
	"logo_cld_pub_id" text,
	"subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_departments" ADD CONSTRAINT "teacher_departments_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_departments" ADD CONSTRAINT "teacher_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_subject_id_idx" ON "classes" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "classes_teacher_id_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "classes_organization_id_idx" ON "classes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dept_organization_id_idx" ON "departments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "enrollments_student_id_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_id_idx" ON "enrollments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "subject_department_id_idx" ON "subjects" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "subject_organization_id_idx" ON "subjects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "teacher_departments_teacher_id_idx" ON "teacher_departments" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_departments_department_id_idx" ON "teacher_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_organization_id_idx" ON "user" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "organization_email_idx" ON "organization" USING btree ("email");