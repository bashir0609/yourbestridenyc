import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'content-manager', 'lead-manager');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_services_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_drivers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__drivers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_fleet_vehicles_category" AS ENUM('sedan', 'suv', 'van', 'minibus', 'coach', 'other');
  CREATE TYPE "public"."enum_fleet_vehicles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__fleet_vehicles_v_version_category" AS ENUM('sedan', 'suv', 'van', 'minibus', 'coach', 'other');
  CREATE TYPE "public"."enum__fleet_vehicles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_testimonials_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__testimonials_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_locations_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__locations_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_blog_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_transportation_leads_source" AS ENUM('public-intake', 'staff', 'import');
  CREATE TYPE "public"."enum_transportation_leads_crm_status" AS ENUM('new', 'contacted', 'qualified', 'booked', 'lost', 'archived');
  CREATE TYPE "public"."enum_driver_applications_source" AS ENUM('public-intake', 'staff', 'import');
  CREATE TYPE "public"."enum_driver_applications_status" AS ENUM('new', 'reviewing', 'interview', 'accepted', 'rejected', 'archived');
  CREATE TABLE "users_sessions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "created_at" timestamp(3) with time zone,
    "expires_at" timestamp(3) with time zone NOT NULL
  );

  CREATE TABLE "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "role" "enum_users_role" DEFAULT 'content-manager' NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "email" varchar NOT NULL,
    "reset_password_token" varchar,
    "reset_password_expiration" timestamp(3) with time zone,
    "salt" varchar,
    "hash" varchar,
    "reset_password_requested_at" timestamp(3) with time zone,
    "login_attempts" numeric DEFAULT 0,
    "lock_until" timestamp(3) with time zone
  );

  CREATE TABLE "media" (
    "id" serial PRIMARY KEY NOT NULL,
    "alt" varchar NOT NULL,
    "caption" varchar,
    "prefix" varchar DEFAULT 'media',
    "_objectkey" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "url" varchar,
    "thumbnail_u_r_l" varchar,
    "filename" varchar,
    "mime_type" varchar,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "focal_x" numeric,
    "focal_y" numeric,
    "sizes_thumbnail_url" varchar,
    "sizes_thumbnail_width" numeric,
    "sizes_thumbnail_height" numeric,
    "sizes_thumbnail_mime_type" varchar,
    "sizes_thumbnail_filesize" numeric,
    "sizes_thumbnail_filename" varchar
  );

  CREATE TABLE "pages" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "slug" varchar,
    "hero_image_id" integer,
    "summary" varchar,
    "content" jsonb,
    "seo_title" varchar,
    "seo_description" varchar,
    "seo_image_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_pages_status" DEFAULT 'draft'
  );

  CREATE TABLE "_pages_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_slug" varchar,
    "version_hero_image_id" integer,
    "version_summary" varchar,
    "version_content" jsonb,
    "version_seo_title" varchar,
    "version_seo_description" varchar,
    "version_seo_image_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__pages_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "services_benefits" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar,
    "description" varchar
  );

  CREATE TABLE "services_features" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "feature" varchar
  );

  CREATE TABLE "services_faqs" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "question" varchar,
    "answer" varchar
  );

  CREATE TABLE "services" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "slug" varchar,
    "development_seed" boolean DEFAULT false,
    "summary" varchar,
    "image_id" integer,
    "content" jsonb,
    "booking_c_t_a_label" varchar,
    "featured" boolean DEFAULT false,
    "display_order" numeric DEFAULT 0,
    "seo_title" varchar,
    "seo_description" varchar,
    "seo_image_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_services_status" DEFAULT 'draft'
  );

  CREATE TABLE "services_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "locations_id" integer
  );

  CREATE TABLE "_services_v_version_benefits" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "description" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_services_v_version_features" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "feature" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_services_v_version_faqs" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "question" varchar,
    "answer" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_services_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_slug" varchar,
    "version_development_seed" boolean DEFAULT false,
    "version_summary" varchar,
    "version_image_id" integer,
    "version_content" jsonb,
    "version_booking_c_t_a_label" varchar,
    "version_featured" boolean DEFAULT false,
    "version_display_order" numeric DEFAULT 0,
    "version_seo_title" varchar,
    "version_seo_description" varchar,
    "version_seo_image_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__services_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_services_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "locations_id" integer
  );

  CREATE TABLE "drivers_languages" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "language" varchar
  );

  CREATE TABLE "drivers_specialties" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "specialty" varchar
  );

  CREATE TABLE "drivers" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "slug" varchar,
    "photo_id" integer,
    "summary" varchar,
    "website_approved" boolean DEFAULT false,
    "bio" jsonb,
    "experience_years" numeric,
    "experience" varchar,
    "featured" boolean DEFAULT false,
    "display_order" numeric DEFAULT 0,
    "seo_title" varchar,
    "seo_description" varchar,
    "seo_image_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_drivers_status" DEFAULT 'draft'
  );

  CREATE TABLE "drivers_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "locations_id" integer
  );

  CREATE TABLE "_drivers_v_version_languages" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "language" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_drivers_v_version_specialties" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "specialty" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_drivers_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_name" varchar,
    "version_slug" varchar,
    "version_photo_id" integer,
    "version_summary" varchar,
    "version_website_approved" boolean DEFAULT false,
    "version_bio" jsonb,
    "version_experience_years" numeric,
    "version_experience" varchar,
    "version_featured" boolean DEFAULT false,
    "version_display_order" numeric DEFAULT 0,
    "version_seo_title" varchar,
    "version_seo_description" varchar,
    "version_seo_image_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__drivers_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_drivers_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "locations_id" integer
  );

  CREATE TABLE "fleet_vehicles_images" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "image_id" integer
  );

  CREATE TABLE "fleet_vehicles_amenities" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "amenity" varchar
  );

  CREATE TABLE "fleet_vehicles" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "slug" varchar,
    "category" "enum_fleet_vehicles_category",
    "passenger_capacity" numeric,
    "summary" varchar,
    "luggage_capacity" numeric,
    "description" jsonb,
    "accessibility_information" varchar,
    "featured" boolean DEFAULT false,
    "display_order" numeric DEFAULT 0,
    "seo_title" varchar,
    "seo_description" varchar,
    "seo_image_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_fleet_vehicles_status" DEFAULT 'draft'
  );

  CREATE TABLE "_fleet_vehicles_v_version_images" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "image_id" integer,
    "_uuid" varchar
  );

  CREATE TABLE "_fleet_vehicles_v_version_amenities" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "amenity" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_fleet_vehicles_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_name" varchar,
    "version_slug" varchar,
    "version_category" "enum__fleet_vehicles_v_version_category",
    "version_passenger_capacity" numeric,
    "version_summary" varchar,
    "version_luggage_capacity" numeric,
    "version_description" jsonb,
    "version_accessibility_information" varchar,
    "version_featured" boolean DEFAULT false,
    "version_display_order" numeric DEFAULT 0,
    "version_seo_title" varchar,
    "version_seo_description" varchar,
    "version_seo_image_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__fleet_vehicles_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "testimonials" (
    "id" serial PRIMARY KEY NOT NULL,
    "attribution" varchar,
    "slug" varchar,
    "website_approved" boolean DEFAULT false,
    "quote" varchar,
    "rating" numeric,
    "service_id" integer,
    "featured" boolean DEFAULT false,
    "display_order" numeric DEFAULT 0,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_testimonials_status" DEFAULT 'draft'
  );

  CREATE TABLE "_testimonials_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_attribution" varchar,
    "version_slug" varchar,
    "version_website_approved" boolean DEFAULT false,
    "version_quote" varchar,
    "version_rating" numeric,
    "version_service_id" integer,
    "version_featured" boolean DEFAULT false,
    "version_display_order" numeric DEFAULT 0,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__testimonials_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "locations_coverage_areas" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "area" varchar
  );

  CREATE TABLE "locations_faqs" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "question" varchar,
    "answer" varchar
  );

  CREATE TABLE "locations" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "slug" varchar,
    "development_seed" boolean DEFAULT false,
    "city" varchar,
    "summary" varchar,
    "region" varchar,
    "country_code" varchar,
    "description" jsonb,
    "image_id" integer,
    "featured" boolean DEFAULT false,
    "display_order" numeric DEFAULT 0,
    "seo_title" varchar,
    "seo_description" varchar,
    "seo_image_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_locations_status" DEFAULT 'draft'
  );

  CREATE TABLE "locations_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "services_id" integer
  );

  CREATE TABLE "_locations_v_version_coverage_areas" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "area" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_locations_v_version_faqs" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "question" varchar,
    "answer" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_locations_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_name" varchar,
    "version_slug" varchar,
    "version_development_seed" boolean DEFAULT false,
    "version_city" varchar,
    "version_summary" varchar,
    "version_region" varchar,
    "version_country_code" varchar,
    "version_description" jsonb,
    "version_image_id" integer,
    "version_featured" boolean DEFAULT false,
    "version_display_order" numeric DEFAULT 0,
    "version_seo_title" varchar,
    "version_seo_description" varchar,
    "version_seo_image_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__locations_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_locations_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "services_id" integer
  );

  CREATE TABLE "blog_posts_tags" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "tag" varchar
  );

  CREATE TABLE "blog_posts" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "slug" varchar,
    "excerpt" varchar,
    "hero_image_id" integer,
    "author_name" varchar,
    "published_at" timestamp(3) with time zone,
    "content" jsonb,
    "featured" boolean DEFAULT false,
    "display_order" numeric DEFAULT 0,
    "seo_title" varchar,
    "seo_description" varchar,
    "seo_image_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_blog_posts_status" DEFAULT 'draft'
  );

  CREATE TABLE "_blog_posts_v_version_tags" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "tag" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_blog_posts_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_slug" varchar,
    "version_excerpt" varchar,
    "version_hero_image_id" integer,
    "version_author_name" varchar,
    "version_published_at" timestamp(3) with time zone,
    "version_content" jsonb,
    "version_featured" boolean DEFAULT false,
    "version_display_order" numeric DEFAULT 0,
    "version_seo_title" varchar,
    "version_seo_description" varchar,
    "version_seo_image_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__blog_posts_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "transportation_leads" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "phone" varchar,
    "service_id" integer,
    "service_type" varchar NOT NULL,
    "pickup_location" varchar,
    "dropoff_location" varchar,
    "pickup_at" timestamp(3) with time zone,
    "preferred_date" varchar,
    "preferred_time" varchar,
    "passengers" numeric,
    "message" varchar,
    "source" "enum_transportation_leads_source" NOT NULL,
    "source_page" varchar NOT NULL,
    "crm_status" "enum_transportation_leads_crm_status" DEFAULT 'new' NOT NULL,
    "external_lead_id" varchar,
    "assigned_to_id" integer,
    "source_campaign" varchar,
    "consent_to_contact" boolean DEFAULT false NOT NULL,
    "consent_recorded_at" timestamp(3) with time zone,
    "internal_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "driver_applications" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "phone" varchar,
    "city" varchar NOT NULL,
    "years_experience" numeric,
    "driving_experience" varchar NOT NULL,
    "license_class" varchar NOT NULL,
    "availability" varchar NOT NULL,
    "message" varchar,
    "source" "enum_driver_applications_source" NOT NULL,
    "source_page" varchar NOT NULL,
    "status" "enum_driver_applications_status" DEFAULT 'new' NOT NULL,
    "assigned_to_id" integer,
    "source_campaign" varchar,
    "consent_to_contact" boolean DEFAULT false NOT NULL,
    "consent_recorded_at" timestamp(3) with time zone,
    "internal_notes" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "driver_applications_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "locations_id" integer
  );

  CREATE TABLE "public_intake_rate_limits" (
    "id" serial PRIMARY KEY NOT NULL,
    "claim_key" varchar NOT NULL,
    "fingerprint" varchar NOT NULL,
    "window_started_at" timestamp(3) with time zone NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_kv" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "data" jsonb NOT NULL
  );

  CREATE TABLE "payload_locked_documents" (
    "id" serial PRIMARY KEY NOT NULL,
    "global_slug" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_locked_documents_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer,
    "media_id" integer,
    "pages_id" integer,
    "services_id" integer,
    "drivers_id" integer,
    "fleet_vehicles_id" integer,
    "testimonials_id" integer,
    "locations_id" integer,
    "blog_posts_id" integer,
    "transportation_leads_id" integer,
    "driver_applications_id" integer,
    "public_intake_rate_limits_id" integer
  );

  CREATE TABLE "payload_preferences" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar,
    "value" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_preferences_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer
  );

  CREATE TABLE "payload_migrations" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "batch" numeric,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "site_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "site_name" varchar DEFAULT 'Your Best Ride Inc.' NOT NULL,
    "tagline" varchar,
    "logo_id" integer,
    "booking_u_r_l" varchar NOT NULL,
    "public_email" varchar,
    "public_phone" varchar,
    "default_s_e_o_title" varchar,
    "default_s_e_o_description" varchar,
    "default_s_e_o_image_id" integer,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  CREATE TABLE "navigation_links" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "label" varchar NOT NULL,
    "href" varchar NOT NULL,
    "new_tab" boolean DEFAULT false
  );

  CREATE TABLE "navigation" (
    "id" serial PRIMARY KEY NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  CREATE TABLE "footer_columns_links" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "label" varchar NOT NULL,
    "href" varchar NOT NULL,
    "new_tab" boolean DEFAULT false
  );

  CREATE TABLE "footer_columns" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "heading" varchar NOT NULL
  );

  CREATE TABLE "footer_legal_links" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "label" varchar NOT NULL,
    "href" varchar NOT NULL,
    "new_tab" boolean DEFAULT false
  );

  CREATE TABLE "footer" (
    "id" serial PRIMARY KEY NOT NULL,
    "description" varchar,
    "copyright" varchar,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_benefits" ADD CONSTRAINT "services_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_features" ADD CONSTRAINT "services_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_faqs" ADD CONSTRAINT "services_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services" ADD CONSTRAINT "services_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_benefits" ADD CONSTRAINT "_services_v_version_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_features" ADD CONSTRAINT "_services_v_version_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_faqs" ADD CONSTRAINT "_services_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "drivers_languages" ADD CONSTRAINT "drivers_languages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "drivers_specialties" ADD CONSTRAINT "drivers_specialties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "drivers" ADD CONSTRAINT "drivers_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "drivers" ADD CONSTRAINT "drivers_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "drivers_rels" ADD CONSTRAINT "drivers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "drivers_rels" ADD CONSTRAINT "drivers_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_drivers_v_version_languages" ADD CONSTRAINT "_drivers_v_version_languages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_drivers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_drivers_v_version_specialties" ADD CONSTRAINT "_drivers_v_version_specialties_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_drivers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_drivers_v" ADD CONSTRAINT "_drivers_v_parent_id_drivers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_drivers_v" ADD CONSTRAINT "_drivers_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_drivers_v" ADD CONSTRAINT "_drivers_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_drivers_v_rels" ADD CONSTRAINT "_drivers_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_drivers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_drivers_v_rels" ADD CONSTRAINT "_drivers_v_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fleet_vehicles_images" ADD CONSTRAINT "fleet_vehicles_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fleet_vehicles_images" ADD CONSTRAINT "fleet_vehicles_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fleet_vehicles_amenities" ADD CONSTRAINT "fleet_vehicles_amenities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_fleet_vehicles_v_version_images" ADD CONSTRAINT "_fleet_vehicles_v_version_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_fleet_vehicles_v_version_images" ADD CONSTRAINT "_fleet_vehicles_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_fleet_vehicles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_fleet_vehicles_v_version_amenities" ADD CONSTRAINT "_fleet_vehicles_v_version_amenities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_fleet_vehicles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_fleet_vehicles_v" ADD CONSTRAINT "_fleet_vehicles_v_parent_id_fleet_vehicles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_fleet_vehicles_v" ADD CONSTRAINT "_fleet_vehicles_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_parent_id_testimonials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_service_id_services_id_fk" FOREIGN KEY ("version_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations_coverage_areas" ADD CONSTRAINT "locations_coverage_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations_faqs" ADD CONSTRAINT "locations_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations_rels" ADD CONSTRAINT "locations_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations_rels" ADD CONSTRAINT "locations_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_locations_v_version_coverage_areas" ADD CONSTRAINT "_locations_v_version_coverage_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_locations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_locations_v_version_faqs" ADD CONSTRAINT "_locations_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_locations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_locations_v" ADD CONSTRAINT "_locations_v_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_locations_v" ADD CONSTRAINT "_locations_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_locations_v" ADD CONSTRAINT "_locations_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_locations_v_rels" ADD CONSTRAINT "_locations_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_locations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_locations_v_rels" ADD CONSTRAINT "_locations_v_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts_tags" ADD CONSTRAINT "blog_posts_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v_version_tags" ADD CONSTRAINT "_blog_posts_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_parent_id_blog_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_posts_v" ADD CONSTRAINT "_blog_posts_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transportation_leads" ADD CONSTRAINT "transportation_leads_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transportation_leads" ADD CONSTRAINT "transportation_leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "driver_applications" ADD CONSTRAINT "driver_applications_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "driver_applications_rels" ADD CONSTRAINT "driver_applications_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."driver_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "driver_applications_rels" ADD CONSTRAINT "driver_applications_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_drivers_fk" FOREIGN KEY ("drivers_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fleet_vehicles_fk" FOREIGN KEY ("fleet_vehicles_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transportation_leads_fk" FOREIGN KEY ("transportation_leads_id") REFERENCES "public"."transportation_leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_driver_applications_fk" FOREIGN KEY ("driver_applications_id") REFERENCES "public"."driver_applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_public_intake_rate_limits_fk" FOREIGN KEY ("public_intake_rate_limits_id") REFERENCES "public"."public_intake_rate_limits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_s_e_o_image_id_media_id_fk" FOREIGN KEY ("default_s_e_o_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_links" ADD CONSTRAINT "navigation_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_legal_links" ADD CONSTRAINT "footer_legal_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_hero_image_idx" ON "pages" USING btree ("hero_image_id");
  CREATE INDEX "pages_seo_seo_image_idx" ON "pages" USING btree ("seo_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_hero_image_idx" ON "_pages_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_pages_v_version_seo_version_seo_image_idx" ON "_pages_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "services_benefits_order_idx" ON "services_benefits" USING btree ("_order");
  CREATE INDEX "services_benefits_parent_id_idx" ON "services_benefits" USING btree ("_parent_id");
  CREATE INDEX "services_features_order_idx" ON "services_features" USING btree ("_order");
  CREATE INDEX "services_features_parent_id_idx" ON "services_features" USING btree ("_parent_id");
  CREATE INDEX "services_faqs_order_idx" ON "services_faqs" USING btree ("_order");
  CREATE INDEX "services_faqs_parent_id_idx" ON "services_faqs" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  CREATE INDEX "services_image_idx" ON "services" USING btree ("image_id");
  CREATE INDEX "services_featured_idx" ON "services" USING btree ("featured");
  CREATE INDEX "services_display_order_idx" ON "services" USING btree ("display_order");
  CREATE INDEX "services_seo_seo_image_idx" ON "services" USING btree ("seo_image_id");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE INDEX "services__status_idx" ON "services" USING btree ("_status");
  CREATE INDEX "services_rels_order_idx" ON "services_rels" USING btree ("order");
  CREATE INDEX "services_rels_parent_idx" ON "services_rels" USING btree ("parent_id");
  CREATE INDEX "services_rels_path_idx" ON "services_rels" USING btree ("path");
  CREATE INDEX "services_rels_locations_id_idx" ON "services_rels" USING btree ("locations_id");
  CREATE INDEX "_services_v_version_benefits_order_idx" ON "_services_v_version_benefits" USING btree ("_order");
  CREATE INDEX "_services_v_version_benefits_parent_id_idx" ON "_services_v_version_benefits" USING btree ("_parent_id");
  CREATE INDEX "_services_v_version_features_order_idx" ON "_services_v_version_features" USING btree ("_order");
  CREATE INDEX "_services_v_version_features_parent_id_idx" ON "_services_v_version_features" USING btree ("_parent_id");
  CREATE INDEX "_services_v_version_faqs_order_idx" ON "_services_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_services_v_version_faqs_parent_id_idx" ON "_services_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "_services_v_parent_idx" ON "_services_v" USING btree ("parent_id");
  CREATE INDEX "_services_v_version_version_slug_idx" ON "_services_v" USING btree ("version_slug");
  CREATE INDEX "_services_v_version_version_image_idx" ON "_services_v" USING btree ("version_image_id");
  CREATE INDEX "_services_v_version_version_featured_idx" ON "_services_v" USING btree ("version_featured");
  CREATE INDEX "_services_v_version_version_display_order_idx" ON "_services_v" USING btree ("version_display_order");
  CREATE INDEX "_services_v_version_seo_version_seo_image_idx" ON "_services_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_services_v_version_version_updated_at_idx" ON "_services_v" USING btree ("version_updated_at");
  CREATE INDEX "_services_v_version_version_created_at_idx" ON "_services_v" USING btree ("version_created_at");
  CREATE INDEX "_services_v_version_version__status_idx" ON "_services_v" USING btree ("version__status");
  CREATE INDEX "_services_v_created_at_idx" ON "_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "_services_v" USING btree ("updated_at");
  CREATE INDEX "_services_v_latest_idx" ON "_services_v" USING btree ("latest");
  CREATE INDEX "_services_v_rels_order_idx" ON "_services_v_rels" USING btree ("order");
  CREATE INDEX "_services_v_rels_parent_idx" ON "_services_v_rels" USING btree ("parent_id");
  CREATE INDEX "_services_v_rels_path_idx" ON "_services_v_rels" USING btree ("path");
  CREATE INDEX "_services_v_rels_locations_id_idx" ON "_services_v_rels" USING btree ("locations_id");
  CREATE INDEX "drivers_languages_order_idx" ON "drivers_languages" USING btree ("_order");
  CREATE INDEX "drivers_languages_parent_id_idx" ON "drivers_languages" USING btree ("_parent_id");
  CREATE INDEX "drivers_specialties_order_idx" ON "drivers_specialties" USING btree ("_order");
  CREATE INDEX "drivers_specialties_parent_id_idx" ON "drivers_specialties" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "drivers_slug_idx" ON "drivers" USING btree ("slug");
  CREATE INDEX "drivers_photo_idx" ON "drivers" USING btree ("photo_id");
  CREATE INDEX "drivers_featured_idx" ON "drivers" USING btree ("featured");
  CREATE INDEX "drivers_display_order_idx" ON "drivers" USING btree ("display_order");
  CREATE INDEX "drivers_seo_seo_image_idx" ON "drivers" USING btree ("seo_image_id");
  CREATE INDEX "drivers_updated_at_idx" ON "drivers" USING btree ("updated_at");
  CREATE INDEX "drivers_created_at_idx" ON "drivers" USING btree ("created_at");
  CREATE INDEX "drivers__status_idx" ON "drivers" USING btree ("_status");
  CREATE INDEX "drivers_rels_order_idx" ON "drivers_rels" USING btree ("order");
  CREATE INDEX "drivers_rels_parent_idx" ON "drivers_rels" USING btree ("parent_id");
  CREATE INDEX "drivers_rels_path_idx" ON "drivers_rels" USING btree ("path");
  CREATE INDEX "drivers_rels_locations_id_idx" ON "drivers_rels" USING btree ("locations_id");
  CREATE INDEX "_drivers_v_version_languages_order_idx" ON "_drivers_v_version_languages" USING btree ("_order");
  CREATE INDEX "_drivers_v_version_languages_parent_id_idx" ON "_drivers_v_version_languages" USING btree ("_parent_id");
  CREATE INDEX "_drivers_v_version_specialties_order_idx" ON "_drivers_v_version_specialties" USING btree ("_order");
  CREATE INDEX "_drivers_v_version_specialties_parent_id_idx" ON "_drivers_v_version_specialties" USING btree ("_parent_id");
  CREATE INDEX "_drivers_v_parent_idx" ON "_drivers_v" USING btree ("parent_id");
  CREATE INDEX "_drivers_v_version_version_slug_idx" ON "_drivers_v" USING btree ("version_slug");
  CREATE INDEX "_drivers_v_version_version_photo_idx" ON "_drivers_v" USING btree ("version_photo_id");
  CREATE INDEX "_drivers_v_version_version_featured_idx" ON "_drivers_v" USING btree ("version_featured");
  CREATE INDEX "_drivers_v_version_version_display_order_idx" ON "_drivers_v" USING btree ("version_display_order");
  CREATE INDEX "_drivers_v_version_seo_version_seo_image_idx" ON "_drivers_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_drivers_v_version_version_updated_at_idx" ON "_drivers_v" USING btree ("version_updated_at");
  CREATE INDEX "_drivers_v_version_version_created_at_idx" ON "_drivers_v" USING btree ("version_created_at");
  CREATE INDEX "_drivers_v_version_version__status_idx" ON "_drivers_v" USING btree ("version__status");
  CREATE INDEX "_drivers_v_created_at_idx" ON "_drivers_v" USING btree ("created_at");
  CREATE INDEX "_drivers_v_updated_at_idx" ON "_drivers_v" USING btree ("updated_at");
  CREATE INDEX "_drivers_v_latest_idx" ON "_drivers_v" USING btree ("latest");
  CREATE INDEX "_drivers_v_rels_order_idx" ON "_drivers_v_rels" USING btree ("order");
  CREATE INDEX "_drivers_v_rels_parent_idx" ON "_drivers_v_rels" USING btree ("parent_id");
  CREATE INDEX "_drivers_v_rels_path_idx" ON "_drivers_v_rels" USING btree ("path");
  CREATE INDEX "_drivers_v_rels_locations_id_idx" ON "_drivers_v_rels" USING btree ("locations_id");
  CREATE INDEX "fleet_vehicles_images_order_idx" ON "fleet_vehicles_images" USING btree ("_order");
  CREATE INDEX "fleet_vehicles_images_parent_id_idx" ON "fleet_vehicles_images" USING btree ("_parent_id");
  CREATE INDEX "fleet_vehicles_images_image_idx" ON "fleet_vehicles_images" USING btree ("image_id");
  CREATE INDEX "fleet_vehicles_amenities_order_idx" ON "fleet_vehicles_amenities" USING btree ("_order");
  CREATE INDEX "fleet_vehicles_amenities_parent_id_idx" ON "fleet_vehicles_amenities" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "fleet_vehicles_slug_idx" ON "fleet_vehicles" USING btree ("slug");
  CREATE INDEX "fleet_vehicles_featured_idx" ON "fleet_vehicles" USING btree ("featured");
  CREATE INDEX "fleet_vehicles_display_order_idx" ON "fleet_vehicles" USING btree ("display_order");
  CREATE INDEX "fleet_vehicles_seo_seo_image_idx" ON "fleet_vehicles" USING btree ("seo_image_id");
  CREATE INDEX "fleet_vehicles_updated_at_idx" ON "fleet_vehicles" USING btree ("updated_at");
  CREATE INDEX "fleet_vehicles_created_at_idx" ON "fleet_vehicles" USING btree ("created_at");
  CREATE INDEX "fleet_vehicles__status_idx" ON "fleet_vehicles" USING btree ("_status");
  CREATE INDEX "_fleet_vehicles_v_version_images_order_idx" ON "_fleet_vehicles_v_version_images" USING btree ("_order");
  CREATE INDEX "_fleet_vehicles_v_version_images_parent_id_idx" ON "_fleet_vehicles_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_fleet_vehicles_v_version_images_image_idx" ON "_fleet_vehicles_v_version_images" USING btree ("image_id");
  CREATE INDEX "_fleet_vehicles_v_version_amenities_order_idx" ON "_fleet_vehicles_v_version_amenities" USING btree ("_order");
  CREATE INDEX "_fleet_vehicles_v_version_amenities_parent_id_idx" ON "_fleet_vehicles_v_version_amenities" USING btree ("_parent_id");
  CREATE INDEX "_fleet_vehicles_v_parent_idx" ON "_fleet_vehicles_v" USING btree ("parent_id");
  CREATE INDEX "_fleet_vehicles_v_version_version_slug_idx" ON "_fleet_vehicles_v" USING btree ("version_slug");
  CREATE INDEX "_fleet_vehicles_v_version_version_featured_idx" ON "_fleet_vehicles_v" USING btree ("version_featured");
  CREATE INDEX "_fleet_vehicles_v_version_version_display_order_idx" ON "_fleet_vehicles_v" USING btree ("version_display_order");
  CREATE INDEX "_fleet_vehicles_v_version_seo_version_seo_image_idx" ON "_fleet_vehicles_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_fleet_vehicles_v_version_version_updated_at_idx" ON "_fleet_vehicles_v" USING btree ("version_updated_at");
  CREATE INDEX "_fleet_vehicles_v_version_version_created_at_idx" ON "_fleet_vehicles_v" USING btree ("version_created_at");
  CREATE INDEX "_fleet_vehicles_v_version_version__status_idx" ON "_fleet_vehicles_v" USING btree ("version__status");
  CREATE INDEX "_fleet_vehicles_v_created_at_idx" ON "_fleet_vehicles_v" USING btree ("created_at");
  CREATE INDEX "_fleet_vehicles_v_updated_at_idx" ON "_fleet_vehicles_v" USING btree ("updated_at");
  CREATE INDEX "_fleet_vehicles_v_latest_idx" ON "_fleet_vehicles_v" USING btree ("latest");
  CREATE UNIQUE INDEX "testimonials_slug_idx" ON "testimonials" USING btree ("slug");
  CREATE INDEX "testimonials_service_idx" ON "testimonials" USING btree ("service_id");
  CREATE INDEX "testimonials_featured_idx" ON "testimonials" USING btree ("featured");
  CREATE INDEX "testimonials_display_order_idx" ON "testimonials" USING btree ("display_order");
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  CREATE INDEX "testimonials__status_idx" ON "testimonials" USING btree ("_status");
  CREATE INDEX "_testimonials_v_parent_idx" ON "_testimonials_v" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_version_version_slug_idx" ON "_testimonials_v" USING btree ("version_slug");
  CREATE INDEX "_testimonials_v_version_version_service_idx" ON "_testimonials_v" USING btree ("version_service_id");
  CREATE INDEX "_testimonials_v_version_version_featured_idx" ON "_testimonials_v" USING btree ("version_featured");
  CREATE INDEX "_testimonials_v_version_version_display_order_idx" ON "_testimonials_v" USING btree ("version_display_order");
  CREATE INDEX "_testimonials_v_version_version_updated_at_idx" ON "_testimonials_v" USING btree ("version_updated_at");
  CREATE INDEX "_testimonials_v_version_version_created_at_idx" ON "_testimonials_v" USING btree ("version_created_at");
  CREATE INDEX "_testimonials_v_version_version__status_idx" ON "_testimonials_v" USING btree ("version__status");
  CREATE INDEX "_testimonials_v_created_at_idx" ON "_testimonials_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_updated_at_idx" ON "_testimonials_v" USING btree ("updated_at");
  CREATE INDEX "_testimonials_v_latest_idx" ON "_testimonials_v" USING btree ("latest");
  CREATE INDEX "locations_coverage_areas_order_idx" ON "locations_coverage_areas" USING btree ("_order");
  CREATE INDEX "locations_coverage_areas_parent_id_idx" ON "locations_coverage_areas" USING btree ("_parent_id");
  CREATE INDEX "locations_faqs_order_idx" ON "locations_faqs" USING btree ("_order");
  CREATE INDEX "locations_faqs_parent_id_idx" ON "locations_faqs" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "locations_slug_idx" ON "locations" USING btree ("slug");
  CREATE INDEX "locations_image_idx" ON "locations" USING btree ("image_id");
  CREATE INDEX "locations_featured_idx" ON "locations" USING btree ("featured");
  CREATE INDEX "locations_display_order_idx" ON "locations" USING btree ("display_order");
  CREATE INDEX "locations_seo_seo_image_idx" ON "locations" USING btree ("seo_image_id");
  CREATE INDEX "locations_updated_at_idx" ON "locations" USING btree ("updated_at");
  CREATE INDEX "locations_created_at_idx" ON "locations" USING btree ("created_at");
  CREATE INDEX "locations__status_idx" ON "locations" USING btree ("_status");
  CREATE INDEX "locations_rels_order_idx" ON "locations_rels" USING btree ("order");
  CREATE INDEX "locations_rels_parent_idx" ON "locations_rels" USING btree ("parent_id");
  CREATE INDEX "locations_rels_path_idx" ON "locations_rels" USING btree ("path");
  CREATE INDEX "locations_rels_services_id_idx" ON "locations_rels" USING btree ("services_id");
  CREATE INDEX "_locations_v_version_coverage_areas_order_idx" ON "_locations_v_version_coverage_areas" USING btree ("_order");
  CREATE INDEX "_locations_v_version_coverage_areas_parent_id_idx" ON "_locations_v_version_coverage_areas" USING btree ("_parent_id");
  CREATE INDEX "_locations_v_version_faqs_order_idx" ON "_locations_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_locations_v_version_faqs_parent_id_idx" ON "_locations_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "_locations_v_parent_idx" ON "_locations_v" USING btree ("parent_id");
  CREATE INDEX "_locations_v_version_version_slug_idx" ON "_locations_v" USING btree ("version_slug");
  CREATE INDEX "_locations_v_version_version_image_idx" ON "_locations_v" USING btree ("version_image_id");
  CREATE INDEX "_locations_v_version_version_featured_idx" ON "_locations_v" USING btree ("version_featured");
  CREATE INDEX "_locations_v_version_version_display_order_idx" ON "_locations_v" USING btree ("version_display_order");
  CREATE INDEX "_locations_v_version_seo_version_seo_image_idx" ON "_locations_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_locations_v_version_version_updated_at_idx" ON "_locations_v" USING btree ("version_updated_at");
  CREATE INDEX "_locations_v_version_version_created_at_idx" ON "_locations_v" USING btree ("version_created_at");
  CREATE INDEX "_locations_v_version_version__status_idx" ON "_locations_v" USING btree ("version__status");
  CREATE INDEX "_locations_v_created_at_idx" ON "_locations_v" USING btree ("created_at");
  CREATE INDEX "_locations_v_updated_at_idx" ON "_locations_v" USING btree ("updated_at");
  CREATE INDEX "_locations_v_latest_idx" ON "_locations_v" USING btree ("latest");
  CREATE INDEX "_locations_v_rels_order_idx" ON "_locations_v_rels" USING btree ("order");
  CREATE INDEX "_locations_v_rels_parent_idx" ON "_locations_v_rels" USING btree ("parent_id");
  CREATE INDEX "_locations_v_rels_path_idx" ON "_locations_v_rels" USING btree ("path");
  CREATE INDEX "_locations_v_rels_services_id_idx" ON "_locations_v_rels" USING btree ("services_id");
  CREATE INDEX "blog_posts_tags_order_idx" ON "blog_posts_tags" USING btree ("_order");
  CREATE INDEX "blog_posts_tags_parent_id_idx" ON "blog_posts_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");
  CREATE INDEX "blog_posts_hero_image_idx" ON "blog_posts" USING btree ("hero_image_id");
  CREATE INDEX "blog_posts_featured_idx" ON "blog_posts" USING btree ("featured");
  CREATE INDEX "blog_posts_display_order_idx" ON "blog_posts" USING btree ("display_order");
  CREATE INDEX "blog_posts_seo_seo_image_idx" ON "blog_posts" USING btree ("seo_image_id");
  CREATE INDEX "blog_posts_updated_at_idx" ON "blog_posts" USING btree ("updated_at");
  CREATE INDEX "blog_posts_created_at_idx" ON "blog_posts" USING btree ("created_at");
  CREATE INDEX "blog_posts__status_idx" ON "blog_posts" USING btree ("_status");
  CREATE INDEX "_blog_posts_v_version_tags_order_idx" ON "_blog_posts_v_version_tags" USING btree ("_order");
  CREATE INDEX "_blog_posts_v_version_tags_parent_id_idx" ON "_blog_posts_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_blog_posts_v_parent_idx" ON "_blog_posts_v" USING btree ("parent_id");
  CREATE INDEX "_blog_posts_v_version_version_slug_idx" ON "_blog_posts_v" USING btree ("version_slug");
  CREATE INDEX "_blog_posts_v_version_version_hero_image_idx" ON "_blog_posts_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_blog_posts_v_version_version_featured_idx" ON "_blog_posts_v" USING btree ("version_featured");
  CREATE INDEX "_blog_posts_v_version_version_display_order_idx" ON "_blog_posts_v" USING btree ("version_display_order");
  CREATE INDEX "_blog_posts_v_version_seo_version_seo_image_idx" ON "_blog_posts_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_blog_posts_v_version_version_updated_at_idx" ON "_blog_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_posts_v_version_version_created_at_idx" ON "_blog_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_posts_v_version_version__status_idx" ON "_blog_posts_v" USING btree ("version__status");
  CREATE INDEX "_blog_posts_v_created_at_idx" ON "_blog_posts_v" USING btree ("created_at");
  CREATE INDEX "_blog_posts_v_updated_at_idx" ON "_blog_posts_v" USING btree ("updated_at");
  CREATE INDEX "_blog_posts_v_latest_idx" ON "_blog_posts_v" USING btree ("latest");
  CREATE INDEX "transportation_leads_service_idx" ON "transportation_leads" USING btree ("service_id");
  CREATE INDEX "transportation_leads_source_idx" ON "transportation_leads" USING btree ("source");
  CREATE INDEX "transportation_leads_crm_status_idx" ON "transportation_leads" USING btree ("crm_status");
  CREATE INDEX "transportation_leads_external_lead_id_idx" ON "transportation_leads" USING btree ("external_lead_id");
  CREATE INDEX "transportation_leads_assigned_to_idx" ON "transportation_leads" USING btree ("assigned_to_id");
  CREATE INDEX "transportation_leads_source_campaign_idx" ON "transportation_leads" USING btree ("source_campaign");
  CREATE INDEX "transportation_leads_updated_at_idx" ON "transportation_leads" USING btree ("updated_at");
  CREATE INDEX "transportation_leads_created_at_idx" ON "transportation_leads" USING btree ("created_at");
  CREATE INDEX "driver_applications_source_idx" ON "driver_applications" USING btree ("source");
  CREATE INDEX "driver_applications_status_idx" ON "driver_applications" USING btree ("status");
  CREATE INDEX "driver_applications_assigned_to_idx" ON "driver_applications" USING btree ("assigned_to_id");
  CREATE INDEX "driver_applications_source_campaign_idx" ON "driver_applications" USING btree ("source_campaign");
  CREATE INDEX "driver_applications_updated_at_idx" ON "driver_applications" USING btree ("updated_at");
  CREATE INDEX "driver_applications_created_at_idx" ON "driver_applications" USING btree ("created_at");
  CREATE INDEX "driver_applications_rels_order_idx" ON "driver_applications_rels" USING btree ("order");
  CREATE INDEX "driver_applications_rels_parent_idx" ON "driver_applications_rels" USING btree ("parent_id");
  CREATE INDEX "driver_applications_rels_path_idx" ON "driver_applications_rels" USING btree ("path");
  CREATE INDEX "driver_applications_rels_locations_id_idx" ON "driver_applications_rels" USING btree ("locations_id");
  CREATE UNIQUE INDEX "public_intake_rate_limits_claim_key_idx" ON "public_intake_rate_limits" USING btree ("claim_key");
  CREATE INDEX "public_intake_rate_limits_fingerprint_idx" ON "public_intake_rate_limits" USING btree ("fingerprint");
  CREATE INDEX "public_intake_rate_limits_window_started_at_idx" ON "public_intake_rate_limits" USING btree ("window_started_at");
  CREATE INDEX "public_intake_rate_limits_expires_at_idx" ON "public_intake_rate_limits" USING btree ("expires_at");
  CREATE INDEX "public_intake_rate_limits_updated_at_idx" ON "public_intake_rate_limits" USING btree ("updated_at");
  CREATE INDEX "public_intake_rate_limits_created_at_idx" ON "public_intake_rate_limits" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_drivers_id_idx" ON "payload_locked_documents_rels" USING btree ("drivers_id");
  CREATE INDEX "payload_locked_documents_rels_fleet_vehicles_id_idx" ON "payload_locked_documents_rels" USING btree ("fleet_vehicles_id");
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("locations_id");
  CREATE INDEX "payload_locked_documents_rels_blog_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_posts_id");
  CREATE INDEX "payload_locked_documents_rels_transportation_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("transportation_leads_id");
  CREATE INDEX "payload_locked_documents_rels_driver_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("driver_applications_id");
  CREATE INDEX "payload_locked_documents_rels_public_intake_rate_limits__idx" ON "payload_locked_documents_rels" USING btree ("public_intake_rate_limits_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_default_s_e_o_default_s_e_o_image_idx" ON "site_settings" USING btree ("default_s_e_o_image_id");
  CREATE INDEX "navigation_links_order_idx" ON "navigation_links" USING btree ("_order");
  CREATE INDEX "navigation_links_parent_id_idx" ON "navigation_links" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_links_order_idx" ON "footer_columns_links" USING btree ("_order");
  CREATE INDEX "footer_columns_links_parent_id_idx" ON "footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "footer_columns_order_idx" ON "footer_columns" USING btree ("_order");
  CREATE INDEX "footer_columns_parent_id_idx" ON "footer_columns" USING btree ("_parent_id");
  CREATE INDEX "footer_legal_links_order_idx" ON "footer_legal_links" USING btree ("_order");
  CREATE INDEX "footer_legal_links_parent_id_idx" ON "footer_legal_links" USING btree ("_parent_id");`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "services_benefits" CASCADE;
  DROP TABLE "services_features" CASCADE;
  DROP TABLE "services_faqs" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "services_rels" CASCADE;
  DROP TABLE "_services_v_version_benefits" CASCADE;
  DROP TABLE "_services_v_version_features" CASCADE;
  DROP TABLE "_services_v_version_faqs" CASCADE;
  DROP TABLE "_services_v" CASCADE;
  DROP TABLE "_services_v_rels" CASCADE;
  DROP TABLE "drivers_languages" CASCADE;
  DROP TABLE "drivers_specialties" CASCADE;
  DROP TABLE "drivers" CASCADE;
  DROP TABLE "drivers_rels" CASCADE;
  DROP TABLE "_drivers_v_version_languages" CASCADE;
  DROP TABLE "_drivers_v_version_specialties" CASCADE;
  DROP TABLE "_drivers_v" CASCADE;
  DROP TABLE "_drivers_v_rels" CASCADE;
  DROP TABLE "fleet_vehicles_images" CASCADE;
  DROP TABLE "fleet_vehicles_amenities" CASCADE;
  DROP TABLE "fleet_vehicles" CASCADE;
  DROP TABLE "_fleet_vehicles_v_version_images" CASCADE;
  DROP TABLE "_fleet_vehicles_v_version_amenities" CASCADE;
  DROP TABLE "_fleet_vehicles_v" CASCADE;
  DROP TABLE "testimonials" CASCADE;
  DROP TABLE "_testimonials_v" CASCADE;
  DROP TABLE "locations_coverage_areas" CASCADE;
  DROP TABLE "locations_faqs" CASCADE;
  DROP TABLE "locations" CASCADE;
  DROP TABLE "locations_rels" CASCADE;
  DROP TABLE "_locations_v_version_coverage_areas" CASCADE;
  DROP TABLE "_locations_v_version_faqs" CASCADE;
  DROP TABLE "_locations_v" CASCADE;
  DROP TABLE "_locations_v_rels" CASCADE;
  DROP TABLE "blog_posts_tags" CASCADE;
  DROP TABLE "blog_posts" CASCADE;
  DROP TABLE "_blog_posts_v_version_tags" CASCADE;
  DROP TABLE "_blog_posts_v" CASCADE;
  DROP TABLE "transportation_leads" CASCADE;
  DROP TABLE "driver_applications" CASCADE;
  DROP TABLE "driver_applications_rels" CASCADE;
  DROP TABLE "public_intake_rate_limits" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "navigation_links" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "footer_columns_links" CASCADE;
  DROP TABLE "footer_columns" CASCADE;
  DROP TABLE "footer_legal_links" CASCADE;
  DROP TABLE "footer" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_services_status";
  DROP TYPE "public"."enum__services_v_version_status";
  DROP TYPE "public"."enum_drivers_status";
  DROP TYPE "public"."enum__drivers_v_version_status";
  DROP TYPE "public"."enum_fleet_vehicles_category";
  DROP TYPE "public"."enum_fleet_vehicles_status";
  DROP TYPE "public"."enum__fleet_vehicles_v_version_category";
  DROP TYPE "public"."enum__fleet_vehicles_v_version_status";
  DROP TYPE "public"."enum_testimonials_status";
  DROP TYPE "public"."enum__testimonials_v_version_status";
  DROP TYPE "public"."enum_locations_status";
  DROP TYPE "public"."enum__locations_v_version_status";
  DROP TYPE "public"."enum_blog_posts_status";
  DROP TYPE "public"."enum__blog_posts_v_version_status";
  DROP TYPE "public"."enum_transportation_leads_source";
  DROP TYPE "public"."enum_transportation_leads_crm_status";
  DROP TYPE "public"."enum_driver_applications_source";
  DROP TYPE "public"."enum_driver_applications_status";`);
}
