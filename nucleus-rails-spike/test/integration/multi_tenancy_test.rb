require "test_helper"

class MultiTenancyTest < ActiveSupport::TestCase
  # Requires a local Postgres test DB with pgcrypto + the RLS policy applied.
  # For the spike, bin/verify_tenancy exercises the same assertions against
  # the dev DB — see docs/Nucleus-Rails-Implementation-Plan-v1.0.md Day 3.

  setup do
    @alice = professionals(:alice)
    @bob = professionals(:bob)
  end

  test "acts_as_tenant scopes reads to the current tenant" do
    ActsAsTenant.with_tenant(@alice) { Client.create!(full_name: "Alice's client") }
    ActsAsTenant.with_tenant(@bob)   { Client.create!(full_name: "Bob's client") }

    ActsAsTenant.with_tenant(@alice) do
      assert_equal [ "Alice's client" ], Client.pluck(:full_name)
    end

    ActsAsTenant.with_tenant(@bob) do
      assert_equal [ "Bob's client" ], Client.pluck(:full_name)
    end
  end

  test "RLS blocks cross-tenant reads even when acts_as_tenant is bypassed" do
    ActsAsTenant.without_tenant do
      Client.create!(professional: @alice, full_name: "Alice's")
      Client.create!(professional: @bob,   full_name: "Bob's")
    end

    ApplicationRecord.with_tenant_setting(@alice.id) do
      # without_tenant removes the acts_as_tenant scope, so any rows returned
      # are the DB's responsibility. RLS must be what filters them.
      visible = ActsAsTenant.without_tenant { Client.unscoped.pluck(:full_name) }
      assert_equal [ "Alice's" ], visible
    end
  end

  test "RLS fails closed: authenticated role + no tenant GUC sees zero rows" do
    ActsAsTenant.without_tenant do
      Client.create!(professional: @alice, full_name: "Alice's")
    end

    # Must SET LOCAL ROLE so RLS applies; the Rails connection role
    # (Supabase postgres) has BYPASSRLS and would silently see everything.
    Client.transaction do
      ActiveRecord::Base.connection.execute("SET LOCAL ROLE authenticated")
      assert_empty ActsAsTenant.without_tenant { Client.unscoped.all }
    end
  end
end
