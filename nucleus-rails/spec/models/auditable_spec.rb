require "rails_helper"

# after_commit callbacks only fire when the outer transaction actually
# commits, so we opt out of transactional fixtures here and clean up by
# hand.
RSpec.describe Auditable, type: :model do
  self.use_transactional_tests = false

  before do
    AuditLog.delete_all
    OrganizationMembership.delete_all
    Organization.delete_all
    Professional.delete_all
    Current.reset
  end

  it "records an audit row on create when Current.organization is set" do
    org = create(:organization)
    Current.organization = org
    professional = create(:professional)

    expect {
      create(:organization_membership, professional: professional, organization: org, role: "member")
    }.to change(AuditLog, :count).by(1)

    log = AuditLog.order(:created_at).last
    expect(log.organization_id).to eq(org.id)
    expect(log.action).to eq("create")
    expect(log.auditable_type).to eq("OrganizationMembership")
  end

  it "is a no-op when Current.organization is nil" do
    expect {
      create(:organization)
    }.not_to change(AuditLog, :count)
  end

  it "records on update and on destroy" do
    org = create(:organization)
    Current.organization = org
    membership = create(:organization_membership, organization: org)

    expect { membership.update!(role: "member") }.to change(AuditLog, :count).by(1)
    update_log = AuditLog.order(:created_at).last
    expect(update_log.action).to eq("update")
    expect(update_log.audited_changes["role"]).to eq([ "owner", "member" ])

    expect { membership.destroy! }.to change(AuditLog, :count).by(1)
    expect(AuditLog.order(:created_at).last.action).to eq("destroy")
  end
end
