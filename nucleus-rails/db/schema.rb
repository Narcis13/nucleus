# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_04_24_140000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "extensions.pg_net"
  enable_extension "extensions.pg_stat_statements"
  enable_extension "extensions.pgcrypto"
  enable_extension "extensions.uuid-ossp"
  enable_extension "graphql.pg_graphql"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "vault.supabase_vault"

  create_table "ahoy_events", force: :cascade do |t|
    t.string "name"
    t.jsonb "properties"
    t.datetime "time"
    t.bigint "user_id"
    t.bigint "visit_id"
    t.index ["name", "time"], name: "index_ahoy_events_on_name_and_time"
    t.index ["properties"], name: "index_ahoy_events_on_properties", opclass: :jsonb_path_ops, using: :gin
    t.index ["user_id"], name: "index_ahoy_events_on_user_id"
    t.index ["visit_id"], name: "index_ahoy_events_on_visit_id"
  end

  create_table "ahoy_visits", force: :cascade do |t|
    t.string "app_version"
    t.string "browser"
    t.string "city"
    t.string "country"
    t.string "device_type"
    t.string "ip"
    t.text "landing_page"
    t.float "latitude"
    t.float "longitude"
    t.string "os"
    t.string "os_version"
    t.string "platform"
    t.text "referrer"
    t.string "referring_domain"
    t.string "region"
    t.datetime "started_at"
    t.text "user_agent"
    t.bigint "user_id"
    t.string "utm_campaign"
    t.string "utm_content"
    t.string "utm_medium"
    t.string "utm_source"
    t.string "utm_term"
    t.string "visit_token"
    t.string "visitor_token"
    t.index ["user_id"], name: "index_ahoy_visits_on_user_id"
    t.index ["visit_token"], name: "index_ahoy_visits_on_visit_token", unique: true
    t.index ["visitor_token", "started_at"], name: "index_ahoy_visits_on_visitor_token_and_started_at"
  end

  create_table "audit_logs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "action", null: false
    t.uuid "actor_id"
    t.string "actor_type", default: "Professional"
    t.uuid "auditable_id", null: false
    t.string "auditable_type", null: false
    t.jsonb "audited_changes", default: {}, null: false
    t.datetime "created_at", null: false
    t.inet "ip_address"
    t.uuid "organization_id", null: false
    t.text "user_agent"
    t.index ["actor_id"], name: "index_audit_logs_on_actor_id"
    t.index ["auditable_type", "auditable_id"], name: "index_audit_logs_on_auditable_type_and_auditable_id"
    t.index ["organization_id", "created_at"], name: "index_audit_logs_on_organization_id_and_created_at"
    t.index ["organization_id"], name: "index_audit_logs_on_organization_id"
  end

  create_table "client_tags", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "client_id", null: false
    t.datetime "created_at", null: false
    t.uuid "tag_id", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id", "tag_id"], name: "index_client_tags_on_client_id_and_tag_id", unique: true
    t.index ["client_id"], name: "index_client_tags_on_client_id"
    t.index ["tag_id"], name: "index_client_tags_on_tag_id"
  end

  create_table "clients", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "assigned_professional_id"
    t.datetime "created_at", null: false
    t.string "email"
    t.string "full_name", null: false
    t.text "notes"
    t.uuid "organization_id", null: false
    t.string "phone"
    t.string "source"
    t.string "status", default: "lead", null: false
    t.datetime "updated_at", null: false
    t.index "organization_id, lower((email)::text)", name: "index_clients_on_organization_and_lower_email", where: "(email IS NOT NULL)"
    t.index ["assigned_professional_id"], name: "index_clients_on_assigned_professional_id"
    t.index ["email"], name: "index_clients_on_email", where: "(email IS NOT NULL)"
    t.index ["organization_id", "created_at"], name: "index_clients_on_organization_id_and_created_at"
    t.index ["organization_id", "status"], name: "index_clients_on_organization_id_and_status"
    t.index ["organization_id"], name: "index_clients_on_organization_id"
  end

  create_table "lead_activities", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "activity_type", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.uuid "lead_id", null: false
    t.jsonb "metadata"
    t.index ["lead_id", "created_at"], name: "index_lead_activities_on_lead_id_and_created_at"
    t.index ["lead_id"], name: "index_lead_activities_on_lead_id"
  end

  create_table "lead_stages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "color", default: "#6366f1", null: false
    t.datetime "created_at", null: false
    t.boolean "is_default", default: false, null: false
    t.boolean "is_lost", default: false, null: false
    t.boolean "is_won", default: false, null: false
    t.string "name", null: false
    t.uuid "organization_id", null: false
    t.integer "position", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "position"], name: "index_lead_stages_on_organization_id_and_position"
    t.index ["organization_id"], name: "index_lead_stages_on_organization_id"
  end

  create_table "leads", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "converted_client_id"
    t.datetime "created_at", null: false
    t.string "email"
    t.string "full_name", null: false
    t.jsonb "metadata"
    t.text "notes"
    t.uuid "organization_id", null: false
    t.string "phone"
    t.integer "score", default: 0, null: false
    t.string "source"
    t.uuid "stage_id", null: false
    t.datetime "updated_at", null: false
    t.index ["converted_client_id"], name: "index_leads_on_converted_client_id"
    t.index ["organization_id", "created_at"], name: "index_leads_on_organization_id_and_created_at"
    t.index ["organization_id"], name: "index_leads_on_organization_id"
    t.index ["stage_id"], name: "index_leads_on_stage_id"
  end

  create_table "organization_memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "organization_id", null: false
    t.uuid "professional_id", null: false
    t.string "role", default: "member", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_organization_memberships_on_organization_id"
    t.index ["professional_id", "organization_id"], name: "idx_memberships_on_pro_and_org", unique: true
    t.index ["professional_id"], name: "index_organization_memberships_on_professional_id"
  end

  create_table "organizations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "clerk_org_id", null: false
    t.datetime "created_at", null: false
    t.string "name"
    t.string "slug"
    t.datetime "updated_at", null: false
    t.index ["clerk_org_id"], name: "index_organizations_on_clerk_org_id", unique: true
    t.index ["slug"], name: "index_organizations_on_slug", unique: true, where: "(slug IS NOT NULL)"
  end

  create_table "personal_access_tokens", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.datetime "last_used_at"
    t.string "name", null: false
    t.uuid "organization_id", null: false
    t.uuid "professional_id", null: false
    t.datetime "revoked_at"
    t.jsonb "scopes", default: [], null: false
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "revoked_at"], name: "idx_personal_access_tokens_on_org_and_revoked"
    t.index ["organization_id"], name: "index_personal_access_tokens_on_organization_id"
    t.index ["professional_id"], name: "index_personal_access_tokens_on_professional_id"
  end

  create_table "professionals", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "clerk_org_id"
    t.string "clerk_user_id", null: false
    t.datetime "created_at", null: false
    t.string "email"
    t.string "full_name"
    t.string "role", default: "owner", null: false
    t.datetime "updated_at", null: false
    t.index ["clerk_org_id"], name: "index_professionals_on_clerk_org_id"
    t.index ["clerk_user_id"], name: "index_professionals_on_clerk_user_id", unique: true
  end

  create_table "solid_cache_entries", force: :cascade do |t|
    t.integer "byte_size", null: false
    t.datetime "created_at", null: false
    t.binary "key", null: false
    t.bigint "key_hash", null: false
    t.binary "value", null: false
    t.index ["byte_size"], name: "index_solid_cache_entries_on_byte_size"
    t.index ["key_hash", "byte_size"], name: "index_solid_cache_entries_on_key_hash_and_byte_size"
    t.index ["key_hash"], name: "index_solid_cache_entries_on_key_hash", unique: true
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.string "concurrency_key", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error"
    t.bigint "job_id", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "active_job_id"
    t.text "arguments"
    t.string "class_name", null: false
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "finished_at"
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at"
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "queue_name", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "hostname"
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.text "metadata"
    t.string "name", null: false
    t.integer "pid", null: false
    t.bigint "supervisor_id"
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.datetime "run_at", null: false
    t.string "task_key", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.text "arguments"
    t.string "class_name"
    t.string "command", limit: 2048
    t.datetime "created_at", null: false
    t.text "description"
    t.string "key", null: false
    t.integer "priority", default: 0
    t.string "queue_name"
    t.string "schedule", null: false
    t.boolean "static", default: true, null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "job_id", null: false
    t.integer "priority", default: 0, null: false
    t.string "queue_name", null: false
    t.datetime "scheduled_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.integer "value", default: 1, null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "tags", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "color", default: "#6b7280", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "organization_id", null: false
    t.datetime "updated_at", null: false
    t.index "organization_id, lower((name)::text)", name: "index_tags_on_organization_and_lower_name", unique: true
    t.index ["organization_id"], name: "index_tags_on_organization_id"
  end

  add_foreign_key "audit_logs", "organizations", on_delete: :cascade
  add_foreign_key "client_tags", "clients", on_delete: :cascade
  add_foreign_key "client_tags", "tags", on_delete: :cascade
  add_foreign_key "clients", "organizations", on_delete: :cascade
  add_foreign_key "clients", "professionals", column: "assigned_professional_id", on_delete: :nullify
  add_foreign_key "lead_activities", "leads", on_delete: :cascade
  add_foreign_key "lead_stages", "organizations", on_delete: :cascade
  add_foreign_key "leads", "clients", column: "converted_client_id", on_delete: :nullify
  add_foreign_key "leads", "lead_stages", column: "stage_id", on_delete: :restrict
  add_foreign_key "leads", "organizations", on_delete: :cascade
  add_foreign_key "organization_memberships", "organizations", on_delete: :cascade
  add_foreign_key "organization_memberships", "professionals", on_delete: :cascade
  add_foreign_key "personal_access_tokens", "organizations", on_delete: :cascade
  add_foreign_key "personal_access_tokens", "professionals", on_delete: :cascade
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "tags", "organizations", on_delete: :cascade
end
