require "rails_helper"

RSpec.describe "Api::V1 rate limiting", type: :request do
  # Rack::Attack caches bucket state; keep it isolated per-example.
  before do
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
  end

  before do
    PersonalAccessToken.unscoped.delete_all
    OrganizationMembership.delete_all
    Organization.delete_all
    Professional.delete_all
  end

  let(:org) { create(:organization) }
  let(:pro) { create(:professional) }
  let!(:mem) { create(:organization_membership, professional: pro, organization: org) }

  it "returns 429 with Retry-After and JSON error envelope when the unauth bucket fills" do
    # Unauth limit is 50/min/IP; fire 55 requests without a token.
    55.times { get "/api/v1/me" }

    expect(response).to have_http_status(:too_many_requests)
    expect(response.headers["Retry-After"]).to be_present
    body = JSON.parse(response.body)
    expect(body.dig("error", "code")).to eq("rate_limited")
  end
end
