class Rs3MultiTenancy < ActiveRecord::Migration[8.1]
  # Rs3 moves the tenancy boundary from the individual professional to the
  # organization. Org-shared domain tables (clients, leads, services) — which
  # arrive in Rs5+ — will scope on organization_id and read the per-request
  # GUC `app.organization_id` that ApplicationRecord.with_tenant_setting sets.
  #
  # This migration introduces the three tables the mechanism needs to exist
  # and to be provable right now:
  #   * organizations             — one row per Clerk org we've observed
  #   * organization_memberships  — (professional, organization, role) join;
  #                                  authoritative role location, replacing
  #                                  the Rs2 column on professionals
  #   * audit_logs                — hand-rolled audit trail keyed on org
  #
  # All three FORCE RLS, all three carry the same fail-closed pattern
  # used in the spike (NULLIF(setting, '')::uuid collapses an unset GUC to
  # NULL so every row comparison fails).

  def up
    safety_assured do
      enable_extension "pgcrypto" unless extension_enabled?("pgcrypto")

      create_table :organizations, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.string :clerk_org_id, null: false
        t.string :name
        t.string :slug
        t.timestamps
      end
      add_index :organizations, :clerk_org_id, unique: true
      add_index :organizations, :slug, unique: true, where: "slug IS NOT NULL"

      create_table :organization_memberships, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :professional, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.references :organization, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.string :role, null: false, default: "member"
        t.timestamps
      end
      add_index :organization_memberships, %i[professional_id organization_id],
                unique: true, name: "idx_memberships_on_pro_and_org"

      create_table :audit_logs, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :organization, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.uuid :actor_id, null: true
        t.string :actor_type, null: true, default: "Professional"
        t.string :action, null: false
        t.string :auditable_type, null: false
        t.uuid :auditable_id, null: false
        t.jsonb :audited_changes, null: false, default: {}
        t.inet :ip_address
        t.text :user_agent
        t.datetime :created_at, null: false
      end
      add_index :audit_logs, %i[auditable_type auditable_id]
      add_index :audit_logs, %i[organization_id created_at]
      add_index :audit_logs, :actor_id

      # Org-scoped RLS. FORCE keeps the policy applied even for the table
      # owner, so the BYPASSRLS gotcha (CLAUDE.md) can't quietly re-open
      # the door if a future session connects as postgres.
      execute <<~SQL
        ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
        CREATE POLICY organizations_tenant_isolation ON organizations
          USING (id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
          WITH CHECK (id = NULLIF(current_setting('app.organization_id', true), '')::uuid);

        ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
        ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;
        -- A member row is visible when either:
        --   * it belongs to the active organization (org-admin view), or
        --   * it belongs to the acting professional (self-lookup so the
        --     controller can resolve "which orgs am I in?" before an
        --     organization_id has been pinned).
        CREATE POLICY memberships_tenant_isolation ON organization_memberships
          USING (
            organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
            OR professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid
          )
          WITH CHECK (
            organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
          );

        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
        CREATE POLICY audit_logs_tenant_isolation ON audit_logs
          USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
          WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);
      SQL
    end
  end

  def down
    safety_assured do
      execute <<~SQL
        DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
        ALTER TABLE audit_logs NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS memberships_tenant_isolation ON organization_memberships;
        ALTER TABLE organization_memberships NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE organization_memberships DISABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS organizations_tenant_isolation ON organizations;
        ALTER TABLE organizations NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
      SQL

      drop_table :audit_logs
      drop_table :organization_memberships
      drop_table :organizations
    end
  end
end
