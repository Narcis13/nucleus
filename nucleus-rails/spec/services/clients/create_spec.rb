require "rails_helper"

RSpec.describe Clients::Create do
  let(:org) { create(:organization) }
  let(:pro) { create(:professional) }

  it "creates a client with organization from caller" do
    result = described_class.call(
      attrs: { full_name: "Alice", email: "alice@example.com" },
      actor: pro, organization: org
    )
    expect(result).to be_success
    expect(result.client).to be_persisted
    expect(result.client.organization_id).to eq(org.id)
  end

  it "returns :invalid on validation failure" do
    result = described_class.call(
      attrs: { full_name: "" }, actor: pro, organization: org
    )
    expect(result).to be_failure
    expect(result.code).to eq(:invalid)
    expect(result.errors[:full_name]).to be_present
  end

  it "returns :unauthenticated when no organization is passed" do
    result = described_class.call(attrs: { full_name: "x" }, actor: pro, organization: nil)
    expect(result).to be_failure
    expect(result.code).to eq(:unauthenticated)
  end
end
