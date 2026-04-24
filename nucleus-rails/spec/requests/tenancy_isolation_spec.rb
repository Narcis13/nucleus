require "rails_helper"

# Defense-in-depth verification: even when the app forgets a .where clause,
# Postgres RLS pins the result set to the active tenant. Runs against the
# real database with transactional fixtures off, because SET LOCAL ROLE
# doesn't nest into savepoints and because we need separate transactions
# per with_tenant_setting block.
RSpec.describe "multi-tenancy RLS isolation", type: :request do
  self.use_transactional_tests = false

  # These tables carry RLS; reset them between runs so accumulated rows
  # from prior specs don't pollute assertions. professionals and Clerk
  # webhook fixtures also get swept for determinism.
  before do
    AuditLog.delete_all
    OrganizationMembership.delete_all
    Organization.delete_all
    Professional.delete_all
  end

  let!(:org_a)   { create(:organization, name: "A") }
  let!(:org_b)   { create(:organization, name: "B") }
  let!(:pro_a)   { create(:professional) }
  let!(:pro_b)   { create(:professional) }
  let!(:mem_a)   { create(:organization_membership, professional: pro_a, organization: org_a, role: "owner") }
  let!(:mem_b)   { create(:organization_membership, professional: pro_b, organization: org_b, role: "owner") }

  it "hides other tenants' organizations when the active org is A" do
    visible_ids = nil
    ApplicationRecord.with_tenant_setting(professional_id: pro_a.id, organization_id: org_a.id) do
      visible_ids = Organization.pluck(:id)
    end
    expect(visible_ids).to eq([ org_a.id ])
  end

  it "hides other tenants' memberships when the active org is A" do
    # Self-rows are visible via the OR-branch of the policy; peers in B must not be.
    visible_ids = nil
    ApplicationRecord.with_tenant_setting(professional_id: pro_a.id, organization_id: org_a.id) do
      visible_ids = OrganizationMembership.pluck(:id)
    end
    expect(visible_ids).to include(mem_a.id)
    expect(visible_ids).not_to include(mem_b.id)
  end

  it "blocks writes that violate the active org's WITH CHECK" do
    expect {
      ApplicationRecord.with_tenant_setting(professional_id: pro_a.id, organization_id: org_a.id) do
        # Trying to plant an audit row under B while A is active must fail.
        AuditLog.create!(
          organization: org_b,
          action: "create",
          auditable_type: "Organization",
          auditable_id: org_b.id,
          audited_changes: {}
        )
      end
    }.to raise_error(ActiveRecord::StatementInvalid, /row-level security|violates/i)
  end

  it "audit_logs are scoped to the active org on read" do
    AuditLog.create!(organization: org_a, action: "create", auditable_type: "Organization",
                     auditable_id: org_a.id, audited_changes: {})
    AuditLog.create!(organization: org_b, action: "create", auditable_type: "Organization",
                     auditable_id: org_b.id, audited_changes: {})

    visible_org_ids = nil
    ApplicationRecord.with_tenant_setting(professional_id: pro_a.id, organization_id: org_a.id) do
      visible_org_ids = AuditLog.pluck(:organization_id).uniq
    end
    expect(visible_org_ids).to eq([ org_a.id ])
  end

  it "returns zero rows when the GUC is unset (fail-closed)" do
    # set_config is not called on any GUC, so NULLIF(current_setting(...), '')
    # collapses to NULL and every row's USING check fails.
    # We still need a minimal tenant setting to switch to `authenticated`.
    visible = nil
    ActiveRecord::Base.transaction do
      ActiveRecord::Base.connection.execute("SET LOCAL ROLE authenticated")
      visible = Organization.count
    end
    expect(visible).to eq(0)
  end
end
