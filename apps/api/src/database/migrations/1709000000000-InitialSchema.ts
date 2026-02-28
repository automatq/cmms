import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709000000000 implements MigrationInterface {
  name = 'InitialSchema1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable required extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_status_enum" AS ENUM('active', 'inactive', 'suspended');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "location_type_enum" AS ENUM('site', 'building', 'zone', 'room');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "asset_status_enum" AS ENUM('active', 'inactive', 'under_repair', 'retired');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "meter_type_enum" AS ENUM('hours', 'cycles', 'km', 'miles', 'none');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "document_type_enum" AS ENUM('manual', 'schematic', 'warranty', 'certificate', 'photo', 'other');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "work_order_type_enum" AS ENUM('corrective', 'preventive', 'inspection', 'emergency');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "work_order_status_enum" AS ENUM('draft', 'open', 'in_progress', 'on_hold', 'completed', 'closed');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "priority_enum" AS ENUM('critical', 'high', 'medium', 'low');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "work_request_status_enum" AS ENUM('pending', 'approved', 'rejected', 'converted');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "trigger_type_enum" AS ENUM('time', 'meter', 'condition', 'calendar', 'event');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "frequency_unit_enum" AS ENUM('day', 'week', 'month', 'year');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "pm_history_status_enum" AS ENUM('on_time', 'late', 'skipped');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "transaction_type_enum" AS ENUM('receive', 'issue', 'adjust', 'transfer', 'return', 'reserve', 'release');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "purchase_order_status_enum" AS ENUM('draft', 'sent', 'partial', 'received', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_type_enum" AS ENUM('wo_assigned', 'wo_status_changed', 'wo_due_soon', 'wo_overdue', 'pm_due', 'low_stock', 'work_request', 'system');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    // Tier 1: Tables with no foreign key dependencies
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "logo_url" character varying,
        "timezone" character varying NOT NULL DEFAULT 'UTC',
        "currency" character varying NOT NULL DEFAULT 'USD',
        "modules" jsonb NOT NULL DEFAULT '{"preventiveMaintenance":true,"inventory":true,"purchaseOrders":true,"reports":true,"aiAssistant":true,"sensors":false,"workRequestsPortal":true}',
        "settings" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "contact_name" character varying,
        "email" character varying,
        "phone" character varying,
        "address" text,
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checklist_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "items" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_checklist_templates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" character varying NOT NULL,
        "action" character varying NOT NULL,
        "resource_type" character varying NOT NULL,
        "resource_id" character varying,
        "before_data" jsonb,
        "after_data" jsonb,
        "ip" character varying,
        "user_agent" character varying,
        "duration_ms" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_push_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" character varying NOT NULL,
        "token" character varying NOT NULL,
        "platform" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_push_tokens" PRIMARY KEY ("id")
      )
    `);

    // Tier 2: Users (PK is app-supplied, not auto-generated)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL,
        "username" character varying NOT NULL,
        "email" character varying NOT NULL,
        "first_name" character varying NOT NULL,
        "last_name" character varying NOT NULL,
        "phone" character varying,
        "job_title" character varying,
        "department" character varying,
        "avatar_url" character varying,
        "status" "user_status_enum" NOT NULL DEFAULT 'active',
        "hourly_rate" decimal(8,2),
        "notification_preferences" jsonb NOT NULL DEFAULT '{}',
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Tier 3: Join tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);

    // Tier 4: Locations (self-referencing)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" "location_type_enum",
        "address" character varying,
        "description" character varying,
        "parent_id" uuid,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_locations_parent" FOREIGN KEY ("parent_id") REFERENCES "locations"("id")
      )
    `);

    // Tier 5: Asset categories (self-ref) and storerooms
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "parent_id" uuid,
        "custom_fields" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "asset_categories"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "storerooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "location_id" uuid,
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_storerooms" PRIMARY KEY ("id"),
        CONSTRAINT "FK_storerooms_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id")
      )
    `);

    // Tier 6: Assets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_number" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "category_id" uuid,
        "parent_id" uuid,
        "location_id" uuid,
        "manufacturer" character varying,
        "model" character varying,
        "serial_number" character varying,
        "purchase_date" date,
        "purchase_cost" decimal(12,2),
        "warranty_expiry" date,
        "expected_life_years" integer,
        "asset_condition" smallint,
        "status" "asset_status_enum" NOT NULL DEFAULT 'active',
        "is_critical" boolean NOT NULL DEFAULT false,
        "qr_code" character varying,
        "meter_type" "meter_type_enum" NOT NULL DEFAULT 'none',
        "current_meter_value" decimal(12,2) NOT NULL DEFAULT 0,
        "custom_fields" jsonb NOT NULL DEFAULT '{}',
        "specifications" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "retired_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_assets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assets_asset_number" UNIQUE ("asset_number"),
        CONSTRAINT "FK_assets_category" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id"),
        CONSTRAINT "FK_assets_parent" FOREIGN KEY ("parent_id") REFERENCES "assets"("id"),
        CONSTRAINT "FK_assets_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id")
      )
    `);

    // Tier 7: Asset children, parts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset_meters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_id" uuid NOT NULL,
        "reading" decimal(12,2) NOT NULL,
        "recorded_by" character varying,
        "notes" text,
        "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_meters" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_meters_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "type" "document_type_enum",
        "storage_key" character varying NOT NULL,
        "mime_type" character varying,
        "size_bytes" bigint,
        "uploaded_by" character varying,
        "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_asset_documents_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sku" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "category" character varying,
        "unit_of_measure" character varying NOT NULL DEFAULT 'each',
        "unit_cost" decimal(10,2),
        "supplier_id" uuid,
        "lead_time_days" integer,
        "min_stock" decimal(8,2) NOT NULL DEFAULT 0,
        "max_stock" decimal(8,2),
        "reorder_qty" decimal(8,2),
        "reorder_point" decimal(8,2),
        "is_critical" boolean NOT NULL DEFAULT false,
        "image_key" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_parts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_parts_sku" UNIQUE ("sku"),
        CONSTRAINT "FK_parts_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
      )
    `);

    // Tier 8: Work orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wo_number" character varying NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "type" "work_order_type_enum" NOT NULL,
        "priority" "priority_enum" NOT NULL DEFAULT 'medium',
        "status" "work_order_status_enum" NOT NULL DEFAULT 'open',
        "asset_id" uuid,
        "location_id" uuid,
        "assigned_to" uuid[] NOT NULL DEFAULT '{}',
        "created_by_id" uuid NOT NULL,
        "scheduled_start" TIMESTAMP WITH TIME ZONE,
        "scheduled_end" TIMESTAMP WITH TIME ZONE,
        "due_date" TIMESTAMP WITH TIME ZONE,
        "actual_start" TIMESTAMP WITH TIME ZONE,
        "actual_end" TIMESTAMP WITH TIME ZONE,
        "estimated_hours" decimal(6,2),
        "actual_hours" decimal(6,2),
        "estimated_cost" decimal(10,2),
        "actual_cost" decimal(10,2),
        "failure_code" character varying,
        "root_cause" text,
        "resolution_notes" text,
        "pm_plan_id" character varying,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_work_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_work_orders_wo_number" UNIQUE ("wo_number"),
        CONSTRAINT "FK_work_orders_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id"),
        CONSTRAINT "FK_work_orders_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_work_orders_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      )
    `);

    // Tier 9: WO children, work requests, PM plans, notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_labor" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wo_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "hours" decimal(5,2) NOT NULL,
        "hourly_rate" decimal(8,2),
        "notes" text,
        "logged_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wo_labor" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wo_labor_wo" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wo_labor_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wo_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "qty_used" decimal(8,2) NOT NULL,
        "unit_cost" decimal(10,2),
        "reserved" boolean NOT NULL DEFAULT false,
        "storeroom_id" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wo_parts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wo_parts_wo" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wo_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "storage_key" character varying NOT NULL,
        "mime_type" character varying,
        "size_bytes" bigint,
        "uploaded_by" character varying,
        "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wo_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wo_attachments_wo" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wo_checklist_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wo_id" uuid NOT NULL,
        "step_index" integer NOT NULL,
        "instruction" character varying NOT NULL,
        "is_completed" boolean NOT NULL DEFAULT false,
        "value" character varying,
        "pass_fail" boolean,
        "photo_key" character varying,
        "notes" text,
        "completed_by" character varying,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wo_checklist_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wo_checklist_results_wo" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "location_id" uuid,
        "asset_id" uuid,
        "priority" character varying NOT NULL DEFAULT 'medium',
        "status" "work_request_status_enum" NOT NULL DEFAULT 'pending',
        "submitted_by" character varying,
        "submitter_email" character varying,
        "submitter_phone" character varying,
        "wo_id" uuid,
        "rejection_reason" text,
        "approved_by" character varying,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_work_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_work_requests_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_work_requests_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id"),
        CONSTRAINT "FK_work_requests_wo" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pm_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "asset_id" uuid,
        "trigger_type" "trigger_type_enum" NOT NULL,
        "frequency_value" integer,
        "frequency_unit" "frequency_unit_enum",
        "meter_interval" decimal(12,2),
        "meter_unit" character varying,
        "last_meter_reading" decimal(12,2),
        "calendar_dates" jsonb,
        "lead_time_days" integer NOT NULL DEFAULT 0,
        "rolling_schedule" boolean NOT NULL DEFAULT true,
        "last_triggered_at" TIMESTAMP WITH TIME ZONE,
        "next_due_at" TIMESTAMP WITH TIME ZONE,
        "assigned_to" uuid[] NOT NULL DEFAULT '{}',
        "priority" character varying NOT NULL DEFAULT 'medium',
        "estimated_hours" decimal(5,2),
        "checklist_template_id" character varying,
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pm_plans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pm_plans_asset" FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    // Tier 10: PM history, inventory, purchase orders
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pm_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pm_plan_id" uuid NOT NULL,
        "wo_id" character varying,
        "due_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "status" "pm_history_status_enum",
        "triggered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pm_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pm_history_plan" FOREIGN KEY ("pm_plan_id") REFERENCES "pm_plans"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_stock" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "part_id" uuid NOT NULL,
        "storeroom_id" uuid NOT NULL,
        "qty_on_hand" decimal(10,2) NOT NULL DEFAULT 0,
        "qty_reserved" decimal(10,2) NOT NULL DEFAULT 0,
        "qty_on_order" decimal(10,2) NOT NULL DEFAULT 0,
        "last_counted_at" TIMESTAMP WITH TIME ZONE,
        "last_received_at" TIMESTAMP WITH TIME ZONE,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_stock" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_stock_part_storeroom" UNIQUE ("part_id", "storeroom_id"),
        CONSTRAINT "FK_inventory_stock_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id"),
        CONSTRAINT "FK_inventory_stock_storeroom" FOREIGN KEY ("storeroom_id") REFERENCES "storerooms"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "part_id" uuid NOT NULL,
        "storeroom_id" uuid NOT NULL,
        "type" "transaction_type_enum" NOT NULL,
        "qty" decimal(10,2) NOT NULL,
        "unit_cost" decimal(10,2),
        "reference_id" character varying,
        "reference_type" character varying,
        "notes" text,
        "performed_by" character varying,
        "performed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_transactions_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id"),
        CONSTRAINT "FK_inventory_transactions_storeroom" FOREIGN KEY ("storeroom_id") REFERENCES "storerooms"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "po_number" character varying NOT NULL,
        "supplier_id" uuid NOT NULL,
        "status" "purchase_order_status_enum" NOT NULL DEFAULT 'draft',
        "created_by" character varying NOT NULL,
        "approved_by" character varying,
        "requested_date" date,
        "expected_date" date,
        "received_date" date,
        "notes" text,
        "shipping_address" text,
        "total_cost" decimal(12,2),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_purchase_orders_po_number" UNIQUE ("po_number"),
        CONSTRAINT "FK_purchase_orders_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
      )
    `);

    // Tier 11: PO line items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "po_line_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "po_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "qty_ordered" decimal(10,2) NOT NULL,
        "qty_received" decimal(10,2) NOT NULL DEFAULT 0,
        "unit_cost" decimal(10,2),
        "storeroom_id" uuid,
        CONSTRAINT "PK_po_line_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_po_line_items_po" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_po_line_items_part" FOREIGN KEY ("part_id") REFERENCES "parts"("id"),
        CONSTRAINT "FK_po_line_items_storeroom" FOREIGN KEY ("storeroom_id") REFERENCES "storerooms"("id")
      )
    `);

    // Create indexes for foreign keys and commonly queried columns
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_roles_user" ON "user_roles" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_roles_role" ON "user_roles" ("role_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_assets_category" ON "assets" ("category_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_assets_location" ON "assets" ("location_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_assets_status" ON "assets" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_meters_asset" ON "asset_meters" ("asset_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_asset_documents_asset" ON "asset_documents" ("asset_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_work_orders_asset" ON "work_orders" ("asset_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_work_orders_status" ON "work_orders" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_work_orders_created_by" ON "work_orders" ("created_by_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_work_orders_due_date" ON "work_orders" ("due_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_labor_wo" ON "wo_labor" ("wo_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_parts_wo" ON "wo_parts" ("wo_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_attachments_wo" ON "wo_attachments" ("wo_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_wo_checklist_results_wo" ON "wo_checklist_results" ("wo_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_work_requests_status" ON "work_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pm_plans_asset" ON "pm_plans" ("asset_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pm_plans_next_due" ON "pm_plans" ("next_due_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pm_history_plan" ON "pm_history" ("pm_plan_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_read" ON "notifications" ("is_read")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_stock_part" ON "inventory_stock" ("part_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_inventory_transactions_part" ON "inventory_transactions" ("part_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_parts_supplier" ON "parts" ("supplier_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "po_line_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_transactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_stock" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pm_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pm_plans" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_checklist_results" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_attachments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_parts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wo_labor" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "asset_documents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "asset_meters" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "parts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "storerooms" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "asset_categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_push_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "checklist_templates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "purchase_order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pm_history_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "frequency_unit_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trigger_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_request_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_order_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "meter_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "asset_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "location_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
  }
}
