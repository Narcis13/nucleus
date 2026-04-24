require "rails_helper"

RSpec.describe Clients::BulkDestroy do
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

  let!(:org) { create(:organization) }
  let!(:pro) { create(:professional) }

  it "deletes all clients in the requested scope and audits each" do
    clients = 50.times.map { |i| Client.create!(organization: org, full_name: "C#{i}") }

    Current.organization = org
    Current.professional = pro
    result = described_class.call(scope: Client.where(organization: org), ids: clients.map(&:id), actor: pro)

    expect(result).to be_success
    expect(result.destroyed.size).to eq(50)
    expect(result.missing).to eq([])

    expect(Client.where(id: clients.map(&:id)).count).to eq(0)
    # One audit row per destroy — Auditable fires after_commit :destroy on
    # each of the 50 clients, and the verifier in the Rs5 plan says all 50
    # should appear.
    expect(AuditLog.where(auditable_type: "Client", action: "destroy").count).to eq(50)
  ensure
    Current.reset
  end

  it "ignores ids that don't exist in scope" do
    kept = Client.create!(organization: org, full_name: "K")
    missing_id = SecureRandom.uuid

    Current.organization = org
    result = described_class.call(scope: Client.where(organization: org), ids: [ kept.id, missing_id ], actor: pro)

    expect(result.destroyed).to eq([ kept.id ])
    expect(result.missing).to eq([ missing_id ])
  ensure
    Current.reset
  end
end
