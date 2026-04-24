class Rs45PersonalAccessTokens < ActiveRecord::Migration[8.1]
  # Rs4.5: personal access tokens power the /api/v1 and /mcp layers.
  #
  # A PAT is (professional, organization, scopes, secret). The plaintext is
  # shown to the user once at issue time and never stored — we keep a bcrypt
  # digest of the secret. The primary key doubles as the lookup id embedded
  # in the presented token, so auth is a keyed lookup + one bcrypt compare.
  #
  # RLS is scoped on organization_id (like the Rs3 audit_logs policy). The
  # first-pass lookup by id runs as `postgres` (BYPASSRLS) — identity
  # resolution, same as Clerk session boot. The verifying refetch happens
  # inside ApplicationRecord.with_tenant_setting so a token whose tenant was
  # deleted can no longer be used to peek at anything.

  def up
    safety_assured do
      create_table :personal_access_tokens, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :professional, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.references :organization, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.string :name, null: false
        t.string :token_digest, null: false
        t.jsonb :scopes, null: false, default: []
        t.datetime :last_used_at
        t.datetime :expires_at
        t.datetime :revoked_at
        t.timestamps
      end
      add_index :personal_access_tokens, [ :organization_id, :revoked_at ],
                name: "idx_personal_access_tokens_on_org_and_revoked"

      execute <<~SQL
        ALTER TABLE personal_access_tokens ENABLE ROW LEVEL SECURITY;
        ALTER TABLE personal_access_tokens FORCE ROW LEVEL SECURITY;
        CREATE POLICY personal_access_tokens_tenant_isolation ON personal_access_tokens
          USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
          WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);
      SQL
    end
  end

  def down
    safety_assured do
      execute <<~SQL
        DROP POLICY IF EXISTS personal_access_tokens_tenant_isolation ON personal_access_tokens;
        ALTER TABLE personal_access_tokens NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE personal_access_tokens DISABLE ROW LEVEL SECURITY;
      SQL

      drop_table :personal_access_tokens
    end
  end
end
