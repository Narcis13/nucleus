class Rs5Clients < ActiveRecord::Migration[8.1]
  # Rs5: full client management under the Rs3 org-scoped tenancy boundary.
  #
  # Three tables land together because tags only make sense paired with the
  # client rows they label and the join table that wires them; one migration
  # keeps that triple atomic.
  #
  #   clients     — org-scoped customer records. FK :organization_id NOT NULL,
  #                 optional :assigned_professional_id for per-agent routing.
  #   tags        — org-scoped labels (name + hex color).
  #   client_tags — (client_id, tag_id) join. Unique per pair so a client can
  #                 carry a tag at most once.
  #
  # All three FORCE ROW LEVEL SECURITY and filter on the same
  # app.organization_id GUC that Rs3 established — identical pattern, so the
  # BYPASSRLS gotcha documented in CLAUDE.md can't quietly re-open a seam.
  #
  # Legacy drop: the spike repo ran a personal-scoped `clients` table (plus
  # `conversations`, `messages`, `notes`) before the Rs3 org boundary existed.
  # Those tables still exist on the dev Supabase DB (schema.rb line 82+) and
  # would conflict with the Rs5 shape. They were experimental, hold no
  # referenceable production data, and the Rs5 plan supersedes them — drop
  # first, recreate second. `if_exists: true` keeps the migration idempotent
  # across environments where the legacy tables were never applied.

  def up
    safety_assured do
      drop_table :messages, if_exists: true
      drop_table :conversations, if_exists: true
      drop_table :notes, if_exists: true
      drop_table :clients, if_exists: true

      create_table :clients, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :organization, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.references :assigned_professional, type: :uuid, null: true,
                     foreign_key: { to_table: :professionals, on_delete: :nullify }
        t.string :full_name, null: false
        t.string :email
        t.string :phone
        t.string :status, null: false, default: "lead"
        t.string :source
        t.text   :notes
        t.timestamps
      end
      add_index :clients, %i[organization_id status]
      add_index :clients, %i[organization_id created_at]
      add_index :clients, :email, where: "email IS NOT NULL"
      # Case-insensitive lookup used by list search + CSV import de-dupe.
      execute <<~SQL
        CREATE INDEX index_clients_on_organization_and_lower_email
          ON clients (organization_id, lower(email))
          WHERE email IS NOT NULL;
      SQL

      create_table :tags, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :organization, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.string :name,  null: false
        t.string :color, null: false, default: "#6b7280"
        t.timestamps
      end
      # Name uniqueness is per-org (case-insensitive) so "VIP" and "vip" can't
      # coexist on one tenant but are independent across tenants.
      execute <<~SQL
        CREATE UNIQUE INDEX index_tags_on_organization_and_lower_name
          ON tags (organization_id, lower(name));
      SQL

      create_table :client_tags, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :client, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.references :tag,    type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.timestamps
      end
      add_index :client_tags, %i[client_id tag_id], unique: true

      # RLS. Pattern matches Rs3 (organizations, memberships, audit_logs) and
      # Rs4.5 (personal_access_tokens): USING for visibility, WITH CHECK for
      # writes, NULLIF(..., '')::uuid so an unset GUC fails closed.
      execute <<~SQL
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        ALTER TABLE clients FORCE ROW LEVEL SECURITY;
        CREATE POLICY clients_tenant_isolation ON clients
          USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
          WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);

        ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
        ALTER TABLE tags FORCE ROW LEVEL SECURITY;
        CREATE POLICY tags_tenant_isolation ON tags
          USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
          WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);

        -- client_tags has no organization_id of its own; we delegate isolation
        -- to the parent rows. Both the client and the tag must be visible
        -- under the active tenant, which closes cross-org joins because
        -- either side being invisible makes the EXISTS check fail.
        ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;
        ALTER TABLE client_tags FORCE ROW LEVEL SECURITY;
        CREATE POLICY client_tags_tenant_isolation ON client_tags
          USING (
            EXISTS (
              SELECT 1 FROM clients c
              WHERE c.id = client_tags.client_id
              AND c.organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM clients c
              WHERE c.id = client_tags.client_id
              AND c.organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
            )
          );
      SQL
    end
  end

  def down
    safety_assured do
      execute <<~SQL
        DROP POLICY IF EXISTS client_tags_tenant_isolation ON client_tags;
        ALTER TABLE client_tags NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE client_tags DISABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS tags_tenant_isolation ON tags;
        ALTER TABLE tags NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE tags DISABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
        ALTER TABLE clients NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
      SQL

      drop_table :client_tags
      drop_table :tags
      drop_table :clients
    end
  end
end
