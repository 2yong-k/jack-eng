CREATE TABLE "corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"original" text NOT NULL,
	"corrected" text NOT NULL,
	"explanation" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_progress" (
	"date" date PRIMARY KEY NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"meaning" text NOT NULL,
	"example" text NOT NULL,
	"source_session_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"scenario" text NOT NULL,
	"title" text NOT NULL,
	"seed_questions" jsonb NOT NULL,
	"target_expressions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topics_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expressions" ADD CONSTRAINT "expressions_source_session_id_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;