class EnableRlsOnMessaging < ActiveRecord::Migration[8.1]
  # Same pattern as EnableRlsOnClients: FORCE so the policy applies even
  # to the DB owner, and NULLIF to fail-closed on unset GUC.
  # professional_id is read from app.professional_id, set per request by
  # ApplicationRecord.with_tenant_setting.

  def up
    safety_assured do
      execute <<~SQL
        ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE conversations FORCE  ROW LEVEL SECURITY;

        CREATE POLICY conversations_tenant_isolation ON conversations
          USING      (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid)
          WITH CHECK (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid);

        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE messages FORCE  ROW LEVEL SECURITY;

        CREATE POLICY messages_tenant_isolation ON messages
          USING      (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid)
          WITH CHECK (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid);
      SQL
    end
  end

  def down
    safety_assured do
      execute <<~SQL
        DROP POLICY IF EXISTS messages_tenant_isolation ON messages;
        ALTER TABLE messages NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE messages DISABLE  ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS conversations_tenant_isolation ON conversations;
        ALTER TABLE conversations NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE conversations DISABLE  ROW LEVEL SECURITY;
      SQL
    end
  end
end
