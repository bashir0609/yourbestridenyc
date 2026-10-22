import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_services_pricing_display_eligible_pricing_model" AS ENUM('fixed', 'hourly', 'mileage', 'contact_only');
  CREATE TYPE "public"."enum__services_v_version_pricing_display_eligible_pricing_model" AS ENUM('fixed', 'hourly', 'mileage', 'contact_only');
  CREATE TYPE "public"."enum_vehicle_classes_tier" AS ENUM('executive_sedan', 'luxury_sedan', 'fullsize_suv', 'executive_sprinter', 'minibus_coach', 'other');
  CREATE TYPE "public"."enum_vehicle_classes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__vehicle_classes_v_version_tier" AS ENUM('executive_sedan', 'luxury_sedan', 'fullsize_suv', 'executive_sprinter', 'minibus_coach', 'other');
  CREATE TYPE "public"."enum__vehicle_classes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_rate_cards_applicable_fees_fee_identifier" AS ENUM('nys_congestion_surcharge', 'mta_cbd_tolling', 'panynj_airport_access', 'commercial_tolls', 'additional_stop', 'child_safety_seat', 'vip_meet_and_greet', 'custom_surcharge');
  CREATE TYPE "public"."enum_rate_cards_applicable_fees_fee_category" AS ENUM('statutory_mandate', 'airport_authority', 'toll_pass_through', 'company_policy', 'passenger_option');
  CREATE TYPE "public"."enum_rate_cards_applicable_fees_trigger_condition" AS ENUM('nyc_manhattan_south_96', 'mta_cbd_entry_south_60', 'airport_origin_or_destination', 'crossing_tolls_actual', 'late_night_window', 'always_mandatory', 'on_demand_request');
  CREATE TYPE "public"."enum_rate_cards_applicable_fees_billing_type" AS ENUM('flat', 'percentage', 'pass_through_actual');
  CREATE TYPE "public"."enum_rate_cards_service_scope" AS ENUM('global', 'service_specific');
  CREATE TYPE "public"."enum_rate_cards_pricing_model" AS ENUM('fixed', 'hourly', 'mileage', 'custom');
  CREATE TYPE "public"."enum_rate_cards_reconciliation_status" AS ENUM('draft', 'internal_review', 'la_pending_verification', 'la_verified', 'published', 'archived');
  CREATE TYPE "public"."enum_rate_cards_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__rate_cards_v_version_applicable_fees_fee_identifier" AS ENUM('nys_congestion_surcharge', 'mta_cbd_tolling', 'panynj_airport_access', 'commercial_tolls', 'additional_stop', 'child_safety_seat', 'vip_meet_and_greet', 'custom_surcharge');
  CREATE TYPE "public"."enum__rate_cards_v_version_applicable_fees_fee_category" AS ENUM('statutory_mandate', 'airport_authority', 'toll_pass_through', 'company_policy', 'passenger_option');
  CREATE TYPE "public"."enum__rate_cards_v_version_applicable_fees_trigger_condition" AS ENUM('nyc_manhattan_south_96', 'mta_cbd_entry_south_60', 'airport_origin_or_destination', 'crossing_tolls_actual', 'late_night_window', 'always_mandatory', 'on_demand_request');
  CREATE TYPE "public"."enum__rate_cards_v_version_applicable_fees_billing_type" AS ENUM('flat', 'percentage', 'pass_through_actual');
  CREATE TYPE "public"."enum__rate_cards_v_version_service_scope" AS ENUM('global', 'service_specific');
  CREATE TYPE "public"."enum__rate_cards_v_version_pricing_model" AS ENUM('fixed', 'hourly', 'mileage', 'custom');
  CREATE TYPE "public"."enum__rate_cards_v_version_reconciliation_status" AS ENUM('draft', 'internal_review', 'la_pending_verification', 'la_verified', 'published', 'archived');
  CREATE TYPE "public"."enum__rate_cards_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_pricing_settings_currency" AS ENUM('USD', 'CAD', 'EUR', 'GBP');
  CREATE TABLE "vehicle_classes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"tier" "enum_vehicle_classes_tier",
  	"passenger_capacity" numeric,
  	"luggage_capacity" numeric,
  	"summary" varchar,
  	"image_id" integer,
  	"display_order" numeric DEFAULT 0,
  	"featured" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_vehicle_classes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_vehicle_classes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_tier" "enum__vehicle_classes_v_version_tier",
  	"version_passenger_capacity" numeric,
  	"version_luggage_capacity" numeric,
  	"version_summary" varchar,
  	"version_image_id" integer,
  	"version_display_order" numeric DEFAULT 0,
  	"version_featured" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__vehicle_classes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "rate_cards_routes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"route_label" varchar,
  	"origin_zone" varchar,
  	"destination_zone" varchar,
  	"origin_location_id" integer,
  	"destination_location_id" integer,
  	"flat_rate" numeric,
  	"additional_stop_fee" numeric DEFAULT 25,
  	"notes" varchar
  );
  
  CREATE TABLE "rate_cards_applicable_fees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"fee_identifier" "enum_rate_cards_applicable_fees_fee_identifier",
  	"fee_name" varchar,
  	"fee_category" "enum_rate_cards_applicable_fees_fee_category",
  	"trigger_condition" "enum_rate_cards_applicable_fees_trigger_condition",
  	"billing_type" "enum_rate_cards_applicable_fees_billing_type",
  	"amount" numeric,
  	"customer_disclosure" varchar
  );
  
  CREATE TABLE "rate_cards_fare_inclusions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "rate_cards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"vehicle_class_id" integer,
  	"service_scope" "enum_rate_cards_service_scope" DEFAULT 'global',
  	"pricing_model" "enum_rate_cards_pricing_model",
  	"effective_from" timestamp(3) with time zone,
  	"effective_to" timestamp(3) with time zone,
  	"currency" varchar DEFAULT 'USD',
  	"hourly_hourly_rate" numeric,
  	"hourly_minimum_hours" numeric DEFAULT 2,
  	"hourly_additional_hour_rate" numeric,
  	"hourly_overtime_increment_minutes" numeric DEFAULT 15,
  	"hourly_overtime_rate" numeric,
  	"mileage_base_fare" numeric,
  	"mileage_per_mile_rate" numeric,
  	"mileage_minimum_fare" numeric,
  	"mileage_per_minute_rate" numeric,
  	"mileage_deadhead_threshold_miles" numeric DEFAULT 35,
  	"mileage_deadhead_rate_per_mile" numeric,
  	"mileage_complimentary_wait_minutes" numeric DEFAULT 15,
  	"mileage_waiting_rate_per_hour" numeric,
  	"commercial_policies_curbside_grace_minutes" numeric DEFAULT 15,
  	"commercial_policies_domestic_airport_grace_minutes" numeric DEFAULT 30,
  	"commercial_policies_international_airport_grace_minutes" numeric DEFAULT 60,
  	"commercial_policies_waiting_hourly_rate" numeric,
  	"commercial_policies_waiting_increment_minutes" numeric DEFAULT 15,
  	"commercial_policies_late_night_surcharge" numeric DEFAULT 25,
  	"commercial_policies_late_night_window_start" varchar DEFAULT '23:00',
  	"commercial_policies_late_night_window_end" varchar DEFAULT '05:00',
  	"commercial_policies_deadhead_policy_note" varchar,
  	"reconciliation_status" "enum_rate_cards_reconciliation_status" DEFAULT 'draft',
  	"reconciliation_la_reference_code" varchar,
  	"reconciliation_reconciliation_notes" varchar,
  	"reconciliation_verification_screenshot_id" integer,
  	"reconciliation_verified_by_id" integer,
  	"reconciliation_verified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_rate_cards_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "rate_cards_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer
  );
  
  CREATE TABLE "_rate_cards_v_version_routes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"route_label" varchar,
  	"origin_zone" varchar,
  	"destination_zone" varchar,
  	"origin_location_id" integer,
  	"destination_location_id" integer,
  	"flat_rate" numeric,
  	"additional_stop_fee" numeric DEFAULT 25,
  	"notes" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_rate_cards_v_version_applicable_fees" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"fee_identifier" "enum__rate_cards_v_version_applicable_fees_fee_identifier",
  	"fee_name" varchar,
  	"fee_category" "enum__rate_cards_v_version_applicable_fees_fee_category",
  	"trigger_condition" "enum__rate_cards_v_version_applicable_fees_trigger_condition",
  	"billing_type" "enum__rate_cards_v_version_applicable_fees_billing_type",
  	"amount" numeric,
  	"customer_disclosure" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_rate_cards_v_version_fare_inclusions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_rate_cards_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_vehicle_class_id" integer,
  	"version_service_scope" "enum__rate_cards_v_version_service_scope" DEFAULT 'global',
  	"version_pricing_model" "enum__rate_cards_v_version_pricing_model",
  	"version_effective_from" timestamp(3) with time zone,
  	"version_effective_to" timestamp(3) with time zone,
  	"version_currency" varchar DEFAULT 'USD',
  	"version_hourly_hourly_rate" numeric,
  	"version_hourly_minimum_hours" numeric DEFAULT 2,
  	"version_hourly_additional_hour_rate" numeric,
  	"version_hourly_overtime_increment_minutes" numeric DEFAULT 15,
  	"version_hourly_overtime_rate" numeric,
  	"version_mileage_base_fare" numeric,
  	"version_mileage_per_mile_rate" numeric,
  	"version_mileage_minimum_fare" numeric,
  	"version_mileage_per_minute_rate" numeric,
  	"version_mileage_deadhead_threshold_miles" numeric DEFAULT 35,
  	"version_mileage_deadhead_rate_per_mile" numeric,
  	"version_mileage_complimentary_wait_minutes" numeric DEFAULT 15,
  	"version_mileage_waiting_rate_per_hour" numeric,
  	"version_commercial_policies_curbside_grace_minutes" numeric DEFAULT 15,
  	"version_commercial_policies_domestic_airport_grace_minutes" numeric DEFAULT 30,
  	"version_commercial_policies_international_airport_grace_minutes" numeric DEFAULT 60,
  	"version_commercial_policies_waiting_hourly_rate" numeric,
  	"version_commercial_policies_waiting_increment_minutes" numeric DEFAULT 15,
  	"version_commercial_policies_late_night_surcharge" numeric DEFAULT 25,
  	"version_commercial_policies_late_night_window_start" varchar DEFAULT '23:00',
  	"version_commercial_policies_late_night_window_end" varchar DEFAULT '05:00',
  	"version_commercial_policies_deadhead_policy_note" varchar,
  	"version_reconciliation_status" "enum__rate_cards_v_version_reconciliation_status" DEFAULT 'draft',
  	"version_reconciliation_la_reference_code" varchar,
  	"version_reconciliation_reconciliation_notes" varchar,
  	"version_reconciliation_verification_screenshot_id" integer,
  	"version_reconciliation_verified_by_id" integer,
  	"version_reconciliation_verified_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__rate_cards_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_rate_cards_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"services_id" integer
  );
  
  CREATE TABLE "pricing_settings_global_inclusions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "pricing_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"currency" "enum_pricing_settings_currency" DEFAULT 'USD',
  	"default_tax_note" varchar DEFAULT 'Rates exclude local sales tax where applicable.',
  	"affiliate_tariff_note" varchar DEFAULT 'Your Best Ride maintains a single universal customer tariff. All chauffeured rides fulfilled through our certified affiliate network are billed at published company rates.',
  	"general_disclosure" jsonb,
  	"pricing_last_reviewed_at" timestamp(3) with time zone,
  	"default_commercial_policies_default_curbside_grace_minutes" numeric DEFAULT 15,
  	"default_commercial_policies_default_domestic_airport_grace_minutes" numeric DEFAULT 30,
  	"default_commercial_policies_default_international_airport_grace_minutes" numeric DEFAULT 60,
  	"default_commercial_policies_default_deadhead_threshold_miles" numeric DEFAULT 35,
  	"default_commercial_policies_default_late_night_window_start" varchar DEFAULT '23:00',
  	"default_commercial_policies_default_late_night_window_end" varchar DEFAULT '05:00',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "services" ADD COLUMN "pricing_display_show_pricing_on_page" boolean DEFAULT false;
  ALTER TABLE "services" ADD COLUMN "pricing_display_pricing_headline" varchar;
  ALTER TABLE "services" ADD COLUMN "pricing_display_eligible_pricing_model" "enum_services_pricing_display_eligible_pricing_model";
  ALTER TABLE "services" ADD COLUMN "pricing_display_show_starting_from" boolean DEFAULT true;
  ALTER TABLE "services" ADD COLUMN "pricing_display_starting_from_note" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_pricing_display_show_pricing_on_page" boolean DEFAULT false;
  ALTER TABLE "_services_v" ADD COLUMN "version_pricing_display_pricing_headline" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_pricing_display_eligible_pricing_model" "enum__services_v_version_pricing_display_eligible_pricing_model";
  ALTER TABLE "_services_v" ADD COLUMN "version_pricing_display_show_starting_from" boolean DEFAULT true;
  ALTER TABLE "_services_v" ADD COLUMN "version_pricing_display_starting_from_note" varchar;
  ALTER TABLE "fleet_vehicles" ADD COLUMN "vehicle_class_id" integer;
  ALTER TABLE "_fleet_vehicles_v" ADD COLUMN "version_vehicle_class_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vehicle_classes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rate_cards_id" integer;
  ALTER TABLE "vehicle_classes" ADD CONSTRAINT "vehicle_classes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_vehicle_classes_v" ADD CONSTRAINT "_vehicle_classes_v_parent_id_vehicle_classes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vehicle_classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_vehicle_classes_v" ADD CONSTRAINT "_vehicle_classes_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rate_cards_routes" ADD CONSTRAINT "rate_cards_routes_origin_location_id_locations_id_fk" FOREIGN KEY ("origin_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rate_cards_routes" ADD CONSTRAINT "rate_cards_routes_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rate_cards_routes" ADD CONSTRAINT "rate_cards_routes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."rate_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "rate_cards_applicable_fees" ADD CONSTRAINT "rate_cards_applicable_fees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."rate_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "rate_cards_fare_inclusions" ADD CONSTRAINT "rate_cards_fare_inclusions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."rate_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_vehicle_class_id_vehicle_classes_id_fk" FOREIGN KEY ("vehicle_class_id") REFERENCES "public"."vehicle_classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_reconciliation_verification_screenshot_id_media_id_fk" FOREIGN KEY ("reconciliation_verification_screenshot_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_reconciliation_verified_by_id_users_id_fk" FOREIGN KEY ("reconciliation_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rate_cards_rels" ADD CONSTRAINT "rate_cards_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."rate_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "rate_cards_rels" ADD CONSTRAINT "rate_cards_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_rate_cards_v_version_routes" ADD CONSTRAINT "_rate_cards_v_version_routes_origin_location_id_locations_id_fk" FOREIGN KEY ("origin_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rate_cards_v_version_routes" ADD CONSTRAINT "_rate_cards_v_version_routes_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rate_cards_v_version_routes" ADD CONSTRAINT "_rate_cards_v_version_routes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_rate_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_rate_cards_v_version_applicable_fees" ADD CONSTRAINT "_rate_cards_v_version_applicable_fees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_rate_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_rate_cards_v_version_fare_inclusions" ADD CONSTRAINT "_rate_cards_v_version_fare_inclusions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_rate_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_rate_cards_v" ADD CONSTRAINT "_rate_cards_v_parent_id_rate_cards_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."rate_cards"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rate_cards_v" ADD CONSTRAINT "_rate_cards_v_version_vehicle_class_id_vehicle_classes_id_fk" FOREIGN KEY ("version_vehicle_class_id") REFERENCES "public"."vehicle_classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rate_cards_v" ADD CONSTRAINT "_rate_cards_v_version_reconciliation_verification_screenshot_id_media_id_fk" FOREIGN KEY ("version_reconciliation_verification_screenshot_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rate_cards_v" ADD CONSTRAINT "_rate_cards_v_version_reconciliation_verified_by_id_users_id_fk" FOREIGN KEY ("version_reconciliation_verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_rate_cards_v_rels" ADD CONSTRAINT "_rate_cards_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_rate_cards_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_rate_cards_v_rels" ADD CONSTRAINT "_rate_cards_v_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pricing_settings_global_inclusions" ADD CONSTRAINT "pricing_settings_global_inclusions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "vehicle_classes_slug_idx" ON "vehicle_classes" USING btree ("slug");
  CREATE INDEX "vehicle_classes_image_idx" ON "vehicle_classes" USING btree ("image_id");
  CREATE INDEX "vehicle_classes_updated_at_idx" ON "vehicle_classes" USING btree ("updated_at");
  CREATE INDEX "vehicle_classes_created_at_idx" ON "vehicle_classes" USING btree ("created_at");
  CREATE INDEX "vehicle_classes__status_idx" ON "vehicle_classes" USING btree ("_status");
  CREATE INDEX "_vehicle_classes_v_parent_idx" ON "_vehicle_classes_v" USING btree ("parent_id");
  CREATE INDEX "_vehicle_classes_v_version_version_slug_idx" ON "_vehicle_classes_v" USING btree ("version_slug");
  CREATE INDEX "_vehicle_classes_v_version_version_image_idx" ON "_vehicle_classes_v" USING btree ("version_image_id");
  CREATE INDEX "_vehicle_classes_v_version_version_updated_at_idx" ON "_vehicle_classes_v" USING btree ("version_updated_at");
  CREATE INDEX "_vehicle_classes_v_version_version_created_at_idx" ON "_vehicle_classes_v" USING btree ("version_created_at");
  CREATE INDEX "_vehicle_classes_v_version_version__status_idx" ON "_vehicle_classes_v" USING btree ("version__status");
  CREATE INDEX "_vehicle_classes_v_created_at_idx" ON "_vehicle_classes_v" USING btree ("created_at");
  CREATE INDEX "_vehicle_classes_v_updated_at_idx" ON "_vehicle_classes_v" USING btree ("updated_at");
  CREATE INDEX "_vehicle_classes_v_latest_idx" ON "_vehicle_classes_v" USING btree ("latest");
  CREATE INDEX "rate_cards_routes_order_idx" ON "rate_cards_routes" USING btree ("_order");
  CREATE INDEX "rate_cards_routes_parent_id_idx" ON "rate_cards_routes" USING btree ("_parent_id");
  CREATE INDEX "rate_cards_routes_origin_location_idx" ON "rate_cards_routes" USING btree ("origin_location_id");
  CREATE INDEX "rate_cards_routes_destination_location_idx" ON "rate_cards_routes" USING btree ("destination_location_id");
  CREATE INDEX "rate_cards_applicable_fees_order_idx" ON "rate_cards_applicable_fees" USING btree ("_order");
  CREATE INDEX "rate_cards_applicable_fees_parent_id_idx" ON "rate_cards_applicable_fees" USING btree ("_parent_id");
  CREATE INDEX "rate_cards_fare_inclusions_order_idx" ON "rate_cards_fare_inclusions" USING btree ("_order");
  CREATE INDEX "rate_cards_fare_inclusions_parent_id_idx" ON "rate_cards_fare_inclusions" USING btree ("_parent_id");
  CREATE INDEX "rate_cards_vehicle_class_idx" ON "rate_cards" USING btree ("vehicle_class_id");
  CREATE INDEX "rate_cards_reconciliation_reconciliation_verification_sc_idx" ON "rate_cards" USING btree ("reconciliation_verification_screenshot_id");
  CREATE INDEX "rate_cards_reconciliation_reconciliation_verified_by_idx" ON "rate_cards" USING btree ("reconciliation_verified_by_id");
  CREATE INDEX "rate_cards_updated_at_idx" ON "rate_cards" USING btree ("updated_at");
  CREATE INDEX "rate_cards_created_at_idx" ON "rate_cards" USING btree ("created_at");
  CREATE INDEX "rate_cards__status_idx" ON "rate_cards" USING btree ("_status");
  CREATE INDEX "rate_cards_rels_order_idx" ON "rate_cards_rels" USING btree ("order");
  CREATE INDEX "rate_cards_rels_parent_idx" ON "rate_cards_rels" USING btree ("parent_id");
  CREATE INDEX "rate_cards_rels_path_idx" ON "rate_cards_rels" USING btree ("path");
  CREATE INDEX "rate_cards_rels_services_id_idx" ON "rate_cards_rels" USING btree ("services_id");
  CREATE INDEX "_rate_cards_v_version_routes_order_idx" ON "_rate_cards_v_version_routes" USING btree ("_order");
  CREATE INDEX "_rate_cards_v_version_routes_parent_id_idx" ON "_rate_cards_v_version_routes" USING btree ("_parent_id");
  CREATE INDEX "_rate_cards_v_version_routes_origin_location_idx" ON "_rate_cards_v_version_routes" USING btree ("origin_location_id");
  CREATE INDEX "_rate_cards_v_version_routes_destination_location_idx" ON "_rate_cards_v_version_routes" USING btree ("destination_location_id");
  CREATE INDEX "_rate_cards_v_version_applicable_fees_order_idx" ON "_rate_cards_v_version_applicable_fees" USING btree ("_order");
  CREATE INDEX "_rate_cards_v_version_applicable_fees_parent_id_idx" ON "_rate_cards_v_version_applicable_fees" USING btree ("_parent_id");
  CREATE INDEX "_rate_cards_v_version_fare_inclusions_order_idx" ON "_rate_cards_v_version_fare_inclusions" USING btree ("_order");
  CREATE INDEX "_rate_cards_v_version_fare_inclusions_parent_id_idx" ON "_rate_cards_v_version_fare_inclusions" USING btree ("_parent_id");
  CREATE INDEX "_rate_cards_v_parent_idx" ON "_rate_cards_v" USING btree ("parent_id");
  CREATE INDEX "_rate_cards_v_version_version_vehicle_class_idx" ON "_rate_cards_v" USING btree ("version_vehicle_class_id");
  CREATE INDEX "_rate_cards_v_version_reconciliation_version_reconciliat_idx" ON "_rate_cards_v" USING btree ("version_reconciliation_verification_screenshot_id");
  CREATE INDEX "_rate_cards_v_version_reconciliation_version_reconcili_1_idx" ON "_rate_cards_v" USING btree ("version_reconciliation_verified_by_id");
  CREATE INDEX "_rate_cards_v_version_version_updated_at_idx" ON "_rate_cards_v" USING btree ("version_updated_at");
  CREATE INDEX "_rate_cards_v_version_version_created_at_idx" ON "_rate_cards_v" USING btree ("version_created_at");
  CREATE INDEX "_rate_cards_v_version_version__status_idx" ON "_rate_cards_v" USING btree ("version__status");
  CREATE INDEX "_rate_cards_v_created_at_idx" ON "_rate_cards_v" USING btree ("created_at");
  CREATE INDEX "_rate_cards_v_updated_at_idx" ON "_rate_cards_v" USING btree ("updated_at");
  CREATE INDEX "_rate_cards_v_latest_idx" ON "_rate_cards_v" USING btree ("latest");
  CREATE INDEX "_rate_cards_v_rels_order_idx" ON "_rate_cards_v_rels" USING btree ("order");
  CREATE INDEX "_rate_cards_v_rels_parent_idx" ON "_rate_cards_v_rels" USING btree ("parent_id");
  CREATE INDEX "_rate_cards_v_rels_path_idx" ON "_rate_cards_v_rels" USING btree ("path");
  CREATE INDEX "_rate_cards_v_rels_services_id_idx" ON "_rate_cards_v_rels" USING btree ("services_id");
  CREATE INDEX "pricing_settings_global_inclusions_order_idx" ON "pricing_settings_global_inclusions" USING btree ("_order");
  CREATE INDEX "pricing_settings_global_inclusions_parent_id_idx" ON "pricing_settings_global_inclusions" USING btree ("_parent_id");
  ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_vehicle_class_id_vehicle_classes_id_fk" FOREIGN KEY ("vehicle_class_id") REFERENCES "public"."vehicle_classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_fleet_vehicles_v" ADD CONSTRAINT "_fleet_vehicles_v_version_vehicle_class_id_vehicle_classes_id_fk" FOREIGN KEY ("version_vehicle_class_id") REFERENCES "public"."vehicle_classes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vehicle_classes_fk" FOREIGN KEY ("vehicle_classes_id") REFERENCES "public"."vehicle_classes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_cards_fk" FOREIGN KEY ("rate_cards_id") REFERENCES "public"."rate_cards"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "fleet_vehicles_vehicle_class_idx" ON "fleet_vehicles" USING btree ("vehicle_class_id");
  CREATE INDEX "_fleet_vehicles_v_version_version_vehicle_class_idx" ON "_fleet_vehicles_v" USING btree ("version_vehicle_class_id");
  CREATE INDEX "payload_locked_documents_rels_vehicle_classes_id_idx" ON "payload_locked_documents_rels" USING btree ("vehicle_classes_id");
  CREATE INDEX "payload_locked_documents_rels_rate_cards_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_cards_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vehicle_classes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_vehicle_classes_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_cards_routes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_cards_applicable_fees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_cards_fare_inclusions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rate_cards_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rate_cards_v_version_routes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rate_cards_v_version_applicable_fees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rate_cards_v_version_fare_inclusions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rate_cards_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_rate_cards_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pricing_settings_global_inclusions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pricing_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "vehicle_classes" CASCADE;
  DROP TABLE "_vehicle_classes_v" CASCADE;
  DROP TABLE "rate_cards_routes" CASCADE;
  DROP TABLE "rate_cards_applicable_fees" CASCADE;
  DROP TABLE "rate_cards_fare_inclusions" CASCADE;
  DROP TABLE "rate_cards" CASCADE;
  DROP TABLE "rate_cards_rels" CASCADE;
  DROP TABLE "_rate_cards_v_version_routes" CASCADE;
  DROP TABLE "_rate_cards_v_version_applicable_fees" CASCADE;
  DROP TABLE "_rate_cards_v_version_fare_inclusions" CASCADE;
  DROP TABLE "_rate_cards_v" CASCADE;
  DROP TABLE "_rate_cards_v_rels" CASCADE;
  DROP TABLE "pricing_settings_global_inclusions" CASCADE;
  DROP TABLE "pricing_settings" CASCADE;
  ALTER TABLE "fleet_vehicles" DROP CONSTRAINT "fleet_vehicles_vehicle_class_id_vehicle_classes_id_fk";
  
  ALTER TABLE "_fleet_vehicles_v" DROP CONSTRAINT "_fleet_vehicles_v_version_vehicle_class_id_vehicle_classes_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vehicle_classes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rate_cards_fk";
  
  DROP INDEX "fleet_vehicles_vehicle_class_idx";
  DROP INDEX "_fleet_vehicles_v_version_version_vehicle_class_idx";
  DROP INDEX "payload_locked_documents_rels_vehicle_classes_id_idx";
  DROP INDEX "payload_locked_documents_rels_rate_cards_id_idx";
  ALTER TABLE "services" DROP COLUMN "pricing_display_show_pricing_on_page";
  ALTER TABLE "services" DROP COLUMN "pricing_display_pricing_headline";
  ALTER TABLE "services" DROP COLUMN "pricing_display_eligible_pricing_model";
  ALTER TABLE "services" DROP COLUMN "pricing_display_show_starting_from";
  ALTER TABLE "services" DROP COLUMN "pricing_display_starting_from_note";
  ALTER TABLE "_services_v" DROP COLUMN "version_pricing_display_show_pricing_on_page";
  ALTER TABLE "_services_v" DROP COLUMN "version_pricing_display_pricing_headline";
  ALTER TABLE "_services_v" DROP COLUMN "version_pricing_display_eligible_pricing_model";
  ALTER TABLE "_services_v" DROP COLUMN "version_pricing_display_show_starting_from";
  ALTER TABLE "_services_v" DROP COLUMN "version_pricing_display_starting_from_note";
  ALTER TABLE "fleet_vehicles" DROP COLUMN "vehicle_class_id";
  ALTER TABLE "_fleet_vehicles_v" DROP COLUMN "version_vehicle_class_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vehicle_classes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rate_cards_id";
  DROP TYPE "public"."enum_services_pricing_display_eligible_pricing_model";
  DROP TYPE "public"."enum__services_v_version_pricing_display_eligible_pricing_model";
  DROP TYPE "public"."enum_vehicle_classes_tier";
  DROP TYPE "public"."enum_vehicle_classes_status";
  DROP TYPE "public"."enum__vehicle_classes_v_version_tier";
  DROP TYPE "public"."enum__vehicle_classes_v_version_status";
  DROP TYPE "public"."enum_rate_cards_applicable_fees_fee_identifier";
  DROP TYPE "public"."enum_rate_cards_applicable_fees_fee_category";
  DROP TYPE "public"."enum_rate_cards_applicable_fees_trigger_condition";
  DROP TYPE "public"."enum_rate_cards_applicable_fees_billing_type";
  DROP TYPE "public"."enum_rate_cards_service_scope";
  DROP TYPE "public"."enum_rate_cards_pricing_model";
  DROP TYPE "public"."enum_rate_cards_reconciliation_status";
  DROP TYPE "public"."enum_rate_cards_status";
  DROP TYPE "public"."enum__rate_cards_v_version_applicable_fees_fee_identifier";
  DROP TYPE "public"."enum__rate_cards_v_version_applicable_fees_fee_category";
  DROP TYPE "public"."enum__rate_cards_v_version_applicable_fees_trigger_condition";
  DROP TYPE "public"."enum__rate_cards_v_version_applicable_fees_billing_type";
  DROP TYPE "public"."enum__rate_cards_v_version_service_scope";
  DROP TYPE "public"."enum__rate_cards_v_version_pricing_model";
  DROP TYPE "public"."enum__rate_cards_v_version_reconciliation_status";
  DROP TYPE "public"."enum__rate_cards_v_version_status";
  DROP TYPE "public"."enum_pricing_settings_currency";`)
}
