require "rails_helper"

RSpec.describe Client do
  # Not transactional: acts_as_tenant + the Postgres RLS block both need their
  # own transaction lifecycle, same rationale as the Rs3 spec.
  self.use_transactional_tests = false

  before do
    AuditLog.delete_all
    ClientTag.delete_all
    Client.unscoped.delete_all
    Tag.unscoped.delete_all
    OrganizationMembership.delete_all
    Organization.delete_all
    Professional.delete_all
  end

  let!(:org_a) { create(:organization, name: "A") }
  let!(:org_b) { create(:organization, name: "B") }

  describe "validations" do
    it "requires full_name" do
      c = Client.new(organization: org_a)
      expect(c).not_to be_valid
      expect(c.errors[:full_name]).to be_present
    end

    it "rejects invalid email" do
      c = Client.new(organization: org_a, full_name: "x", email: "not-an-email")
      expect(c).not_to be_valid
      expect(c.errors[:email]).to be_present
    end

    it "rejects unknown status" do
      c = Client.new(organization: org_a, full_name: "x", status: "whatever")
      expect(c).not_to be_valid
      expect(c.errors[:status]).to be_present
    end
  end

  describe "RLS isolation" do
    it "hides rows from another tenant under with_tenant_setting" do
      ApplicationRecord.with_tenant_setting(organization_id: org_a.id) do
        Client.create!(organization_id: org_a.id, full_name: "A-client")
      end
      ApplicationRecord.with_tenant_setting(organization_id: org_b.id) do
        Client.create!(organization_id: org_b.id, full_name: "B-client")
      end

      visible_names = nil
      ApplicationRecord.with_tenant_setting(organization_id: org_a.id) do
        visible_names = Client.pluck(:full_name)
      end
      expect(visible_names).to eq([ "A-client" ])
    end

    it "rejects writes to another org via WITH CHECK at the DB layer" do
      # The belongs_to validation would also fail (the target org is invisible
      # under the active tenant's RLS) — but we want to verify the DB-level
      # backstop, not just the model layer. Use insert_all to bypass
      # validations and callbacks and prove RLS is the real gate.
      expect {
        ApplicationRecord.with_tenant_setting(organization_id: org_a.id) do
          Client.insert_all([ {
            organization_id: org_b.id,
            full_name: "smuggled",
            status: "lead",
            created_at: Time.current,
            updated_at: Time.current
          } ])
        end
      }.to raise_error(ActiveRecord::StatementInvalid, /row-level security|violates/i)
    end
  end
end
