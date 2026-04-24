class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # Sets the Postgres GUCs that RLS policies on tenant-scoped tables read,
  # and downgrades to the Supabase `authenticated` role for the duration of
  # the block.
  #
  # Why the role switch: Supabase's default `postgres` role has BYPASSRLS,
  # so policies are silently ignored for any connection that runs as it —
  # which is every Rails connection. `authenticated` has full CRUD on public
  # tables but no BYPASSRLS, so policies apply as intended.
  #
  # Why a transaction: both SET LOCAL ROLE and set_config(..., is_local=true)
  # only hold inside a transaction, then auto-reset on COMMIT/ROLLBACK —
  # no cleanup logic needed on connection checkin.
  #
  # Rs3: accepts :professional_id and/or :organization_id. Personal-scoped
  # tables (calendar slots, internal notes) read app.professional_id;
  # org-shared tables (clients, leads, services) read app.organization_id.
  # At least one must be present.
  def self.with_tenant_setting(professional_id: nil, organization_id: nil)
    if professional_id.blank? && organization_id.blank?
      raise ArgumentError, "at least one of professional_id or organization_id required"
    end

    transaction do
      if professional_id.present?
        connection.exec_query(
          "SELECT set_config('app.professional_id', $1, true)",
          "SET app.professional_id",
          [ professional_id.to_s ]
        )
      end
      if organization_id.present?
        connection.exec_query(
          "SELECT set_config('app.organization_id', $1, true)",
          "SET app.organization_id",
          [ organization_id.to_s ]
        )
      end
      connection.execute("SET LOCAL ROLE authenticated")
      yield
    end
  end
end
