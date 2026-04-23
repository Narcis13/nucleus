class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # Sets the Postgres GUC `app.professional_id` that the RLS policy on
  # `clients` (and future tenant tables) reads, and downgrades to the
  # Supabase `authenticated` role for the duration of the block.
  #
  # Why the role switch: Supabase's default `postgres` role has BYPASSRLS,
  # so policies are silently ignored for any connection that runs as it —
  # which is every Rails connection in dev. `authenticated` has full CRUD
  # on public tables but no BYPASSRLS, so policies apply as intended.
  #
  # Why a transaction: both SET LOCAL ROLE and set_config(..., is_local=true)
  # only hold inside a transaction, then auto-reset on COMMIT/ROLLBACK —
  # no cleanup logic needed on the connection checkin.
  def self.with_tenant_setting(professional_id)
    raise ArgumentError, "professional_id required" if professional_id.blank?

    transaction do
      connection.exec_query(
        "SELECT set_config('app.professional_id', $1, true)",
        "SET app.professional_id",
        [ professional_id.to_s ]
      )
      connection.execute("SET LOCAL ROLE authenticated")
      yield
    end
  end
end
