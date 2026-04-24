require "rails_helper"

# Uses real Postgres (no RLS dependency — Issue writes as postgres). The
# transactional-fixtures default is fine here; we don't cross tenant context.
RSpec.describe PersonalAccessTokens::Issue do
  let(:org) { create(:organization) }
  let(:pro) { create(:professional) }

  it "creates a PAT and returns the one-time plaintext" do
    result = described_class.call(
      professional: pro, organization: org,
      name: "CI bot", scopes: %w[clients:read]
    )

    expect(result).to be_success
    expect(result[:personal_access_token]).to be_persisted
    expect(result[:plaintext]).to start_with(PersonalAccessToken::PREFIX)
    expect(result[:plaintext]).to include(PersonalAccessToken.uuid_to_hex(result[:personal_access_token].id))
  end

  it "rejects missing name as :invalid (service-object failure envelope)" do
    result = described_class.call(
      professional: pro, organization: org,
      name: "  ", scopes: %w[clients:read]
    )

    expect(result).to be_failure
    expect(result.code).to eq(:invalid)
    expect(result.errors).to include(:name)
  end

  it "rejects empty scopes" do
    result = described_class.call(
      professional: pro, organization: org,
      name: "x", scopes: []
    )

    expect(result).to be_failure
    expect(result.code).to eq(:invalid)
  end

  it "digest verifies against the returned plaintext and only that" do
    result = described_class.call(
      professional: pro, organization: org,
      name: "verify", scopes: %w[me:read]
    )

    pat = result[:personal_access_token]
    _, secret = PersonalAccessToken.parse_presented(result[:plaintext])
    expect(pat.authenticate_secret(secret)).to be true
    expect(pat.authenticate_secret("wrong")).to be false
  end
end
