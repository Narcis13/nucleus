class EnableRlsOnClients < ActiveRecord::Migration[8.1]
  # RLS is defense-in-depth behind acts_as_tenant. The policy reads
  # the per-request GUC app.professional_id that ApplicationController
  # sets via ApplicationRecord.with_tenant_setting (uses set_config with
  # bind params — no SQL interpolation of the UUID).
  #
  # Postgres owners (and Supabase's `postgres` role) bypass RLS unless
  # FORCE is set. We FORCE here so the policy applies uniformly, even
  # when the app connects as the DB owner in dev.
  #
  # NULLIF(..., '') makes an unset GUC evaluate to NULL, which fails the
  # equality check and blocks all rows — fail-closed.

  def up
    safety_assured do
      execute <<~SQL
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        ALTER TABLE clients FORCE ROW LEVEL SECURITY;

        CREATE POLICY clients_tenant_isolation ON clients
          USING (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid)
          WITH CHECK (professional_id = NULLIF(current_setting('app.professional_id', true), '')::uuid);
      SQL
    end
  end

  def down
    safety_assured do
      execute <<~SQL
        DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
        ALTER TABLE clients NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
      SQL
    end
  end
end
