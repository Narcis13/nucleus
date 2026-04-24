require "rails_helper"

RSpec.describe "Api::V1::Clients", type: :request do
  # RLS needs its own transactions; same rationale as /me + tenancy specs.
  self.use_transactional_tests = false

  def issue_token(professional:, organization:, scopes:)
    result = PersonalAccessTokens::Issue.call(
      professional: professional, organization: organization,
      name: "Test #{SecureRandom.hex(3)}", scopes: scopes
    )
    [ result[:personal_access_token], result[:plaintext] ]
  end

  before do
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
    AuditLog.delete_all
    ClientTag.delete_all
    Client.unscoped.delete_all
    Tag.unscoped.delete_all
    PersonalAccessToken.unscoped.delete_all
    OrganizationMembership.delete_all
    Organization.delete_all
    Professional.delete_all
  end

  let!(:org)   { create(:organization) }
  let!(:pro)   { create(:professional) }
  let!(:mem)   { create(:organization_membership, professional: pro, organization: org, role: "owner") }

  describe "GET /api/v1/clients" do
    it "returns paginated JSON with pagination headers when authorized" do
      ApplicationRecord.with_tenant_setting(organization_id: org.id) do
        3.times { |i| Client.create!(organization: org, full_name: "C#{i}") }
      end
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[clients:read])

      get "/api/v1/clients", headers: { "Authorization" => "Bearer #{plaintext}" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["clients"].size).to eq(3)
      expect(response.headers["X-Total-Count"]).to eq("3")
    end

    it "401s without a token" do
      get "/api/v1/clients"
      expect(response).to have_http_status(:unauthorized)
    end

    it "403s without the clients:read scope" do
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[me:read])
      get "/api/v1/clients", headers: { "Authorization" => "Bearer #{plaintext}" }
      expect(response).to have_http_status(:forbidden)
    end

    it "accepts clients:write as implying read" do
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[clients:write])
      get "/api/v1/clients", headers: { "Authorization" => "Bearer #{plaintext}" }
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /api/v1/clients" do
    it "creates a client through the service object and returns 201" do
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[clients:write])

      post "/api/v1/clients",
           headers: { "Authorization" => "Bearer #{plaintext}", "Content-Type" => "application/json" },
           params: { client: { full_name: "Alice", email: "alice@example.com" } }.to_json

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body.dig("client", "full_name")).to eq("Alice")
      expect(body.dig("client", "organization_id")).to eq(org.id)
    end

    it "returns :invalid envelope on validation failure" do
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[clients:write])

      post "/api/v1/clients",
           headers: { "Authorization" => "Bearer #{plaintext}", "Content-Type" => "application/json" },
           params: { client: { full_name: "" } }.to_json

      expect(response).to have_http_status(:unprocessable_content)
      expect(JSON.parse(response.body)).to match("error" => hash_including("code" => "invalid"))
    end
  end

  describe "cross-tenant isolation" do
    let!(:other_org) { create(:organization, name: "Other") }
    let!(:other_pro) { create(:professional) }
    let!(:other_mem) { create(:organization_membership, professional: other_pro, organization: other_org, role: "owner") }

    it "returns 404 (not 403) when asking for another tenant's client id" do
      foreign_client = nil
      ApplicationRecord.with_tenant_setting(organization_id: other_org.id) do
        foreign_client = Client.create!(organization: other_org, full_name: "Hidden")
      end
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[clients:read])

      get "/api/v1/clients/#{foreign_client.id}",
          headers: { "Authorization" => "Bearer #{plaintext}" }

      expect(response).to have_http_status(:not_found)
      body = JSON.parse(response.body)
      expect(body.dig("error", "code")).to eq("not_found")
    end
  end

  describe "POST /api/v1/clients/bulk_destroy" do
    it "deletes supplied ids and returns the lists" do
      ids = ApplicationRecord.with_tenant_setting(organization_id: org.id) do
        3.times.map { |i| Client.create!(organization: org, full_name: "C#{i}").id }
      end
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[clients:write])

      post "/api/v1/clients/bulk_destroy",
           headers: { "Authorization" => "Bearer #{plaintext}", "Content-Type" => "application/json" },
           params: { client_ids: ids }.to_json

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["destroyed"]).to match_array(ids)
    end
  end
end
