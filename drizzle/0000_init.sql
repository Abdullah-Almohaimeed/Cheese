CREATE TYPE "public"."category" AS ENUM('movie', 'series', 'anime', 'manga', 'book', 'game');--> statement-breakpoint
CREATE TYPE "public"."friend_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."night_status" AS ENUM('voting', 'set', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."override_kind" AS ENUM('add', 'block');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('must', 'someday');--> statement-breakpoint
CREATE TYPE "public"."rsvp" AS ENUM('going', 'maybe', 'cant');--> statement-breakpoint
CREATE TYPE "public"."item_source" AS ENUM('tmdb', 'anilist', 'openlibrary', 'googlebooks', 'igdb', 'manual');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('want', 'in_progress', 'paused', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."progress_unit" AS ENUM('watch', 'episode', 'chapter', 'page', 'minute');--> statement-breakpoint
CREATE TABLE "entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"status" "entry_status" DEFAULT 'want' NOT NULL,
	"priority" "priority" DEFAULT 'someday' NOT NULL,
	"together" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"rating_half" smallint,
	"review" text,
	"platform" text,
	"total_override" integer,
	"would_redo" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_progress_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_rating_range" CHECK ("entry"."rating_half" is null or "entry"."rating_half" between 1 and 10),
	CONSTRAINT "entry_progress_nonneg" CHECK ("entry"."progress" >= 0)
);
--> statement-breakpoint
CREATE TABLE "free_override" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"kind" "override_kind" NOT NULL,
	"start_min" smallint NOT NULL,
	"end_min" smallint NOT NULL,
	CONSTRAINT "free_override_range" CHECK ("free_override"."start_min" >= 0 and "free_override"."end_min" <= 1440 and "free_override"."start_min" < "free_override"."end_min")
);
--> statement-breakpoint
CREATE TABLE "free_window" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start_min" smallint NOT NULL,
	"end_min" smallint NOT NULL,
	CONSTRAINT "free_window_weekday" CHECK ("free_window"."weekday" between 0 and 6),
	CONSTRAINT "free_window_range" CHECK ("free_window"."start_min" >= 0 and "free_window"."end_min" <= 1440 and "free_window"."start_min" < "free_window"."end_min")
);
--> statement-breakpoint
CREATE TABLE "friend_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_low" text NOT NULL,
	"user_high" text NOT NULL,
	"status" "friend_status" DEFAULT 'pending' NOT NULL,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendship_order" CHECK ("friendship"."user_low" < "friendship"."user_high")
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"group_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_member_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "category" NOT NULL,
	"source" "item_source" NOT NULL,
	"external_id" text,
	"title" text NOT NULL,
	"creator" text,
	"year" integer,
	"cover_url" text,
	"summary" text,
	"unit" "progress_unit" NOT NULL,
	"total_units" integer,
	"unit_seconds" integer,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "night" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"host_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"status" "night_status" DEFAULT 'voting' NOT NULL,
	"chosen_option_id" uuid,
	"units" integer,
	"public_token" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "night_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "night_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"night_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer NOT NULL,
	CONSTRAINT "night_option_duration" CHECK ("night_option"."duration_min" > 0)
);
--> statement-breakpoint
CREATE TABLE "night_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"night_id" uuid NOT NULL,
	"user_id" text,
	"guest_name" text,
	"guest_secret" text,
	"rsvp" "rsvp",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "night_participant_who" CHECK (("night_participant"."user_id" is not null) <> ("night_participant"."guest_name" is not null))
);
--> statement-breakpoint
CREATE TABLE "night_vote" (
	"option_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	CONSTRAINT "night_vote_option_id_participant_id_pk" PRIMARY KEY("option_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "plan_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid,
	"title" text NOT NULL,
	"category" "category",
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer NOT NULL,
	"units" integer,
	"night_id" uuid,
	"note" text,
	"done" boolean DEFAULT false NOT NULL,
	"reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_session_duration" CHECK ("plan_session"."duration_min" > 0)
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_tone" smallint DEFAULT 1 NOT NULL,
	"weekly_goal_minutes" integer DEFAULT 360 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"ics_token" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_username_unique" UNIQUE("username"),
	CONSTRAINT "profile_ics_token_unique" UNIQUE("ics_token"),
	CONSTRAINT "profile_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "profile_avatar_tone" CHECK ("profile"."avatar_tone" between 1 and 4)
);
--> statement-breakpoint
CREATE TABLE "progress_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"entry_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"delta_units" integer NOT NULL,
	"minutes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
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
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
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
ALTER TABLE "entry" ADD CONSTRAINT "entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_override" ADD CONSTRAINT "free_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "free_window" ADD CONSTRAINT "free_window_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_group" ADD CONSTRAINT "friend_group_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_low_user_id_fk" FOREIGN KEY ("user_low") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_high_user_id_fk" FOREIGN KEY ("user_high") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_friend_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."friend_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night" ADD CONSTRAINT "night_group_id_friend_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."friend_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night" ADD CONSTRAINT "night_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night" ADD CONSTRAINT "night_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_option" ADD CONSTRAINT "night_option_night_id_night_id_fk" FOREIGN KEY ("night_id") REFERENCES "public"."night"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_participant" ADD CONSTRAINT "night_participant_night_id_night_id_fk" FOREIGN KEY ("night_id") REFERENCES "public"."night"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_participant" ADD CONSTRAINT "night_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_vote" ADD CONSTRAINT "night_vote_option_id_night_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."night_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "night_vote" ADD CONSTRAINT "night_vote_participant_id_night_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."night_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_session" ADD CONSTRAINT "plan_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_session" ADD CONSTRAINT "plan_session_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_session" ADD CONSTRAINT "plan_session_night_id_night_id_fk" FOREIGN KEY ("night_id") REFERENCES "public"."night"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_log" ADD CONSTRAINT "progress_log_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entry_user_item_uq" ON "entry" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "entry_user_status_idx" ON "entry" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "entry_item_idx" ON "entry" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "free_override_user_day_idx" ON "free_override" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "free_window_user_idx" ON "free_window" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendship_pair_uq" ON "friendship" USING btree ("user_low","user_high");--> statement-breakpoint
CREATE INDEX "friendship_high_idx" ON "friendship" USING btree ("user_high");--> statement-breakpoint
CREATE INDEX "group_member_user_idx" ON "group_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_source_external_uq" ON "item" USING btree ("source","external_id") WHERE "item"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "item_category_idx" ON "item" USING btree ("category");--> statement-breakpoint
CREATE INDEX "night_group_idx" ON "night" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "night_option_night_idx" ON "night_option" USING btree ("night_id");--> statement-breakpoint
CREATE UNIQUE INDEX "night_participant_user_uq" ON "night_participant" USING btree ("night_id","user_id") WHERE "night_participant"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "night_participant_night_idx" ON "night_participant" USING btree ("night_id");--> statement-breakpoint
CREATE INDEX "plan_session_user_start_idx" ON "plan_session" USING btree ("user_id","starts_at");--> statement-breakpoint
CREATE INDEX "plan_session_night_idx" ON "plan_session" USING btree ("night_id");--> statement-breakpoint
CREATE INDEX "progress_log_user_at_idx" ON "progress_log" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "push_subscription_user_idx" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");