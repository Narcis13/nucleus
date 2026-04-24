require "rails_helper"

# Turns off transactional fixtures so SET LOCAL ROLE in the API's tenant
# block gets its own transaction. Same rationale as tenancy_isolation_spec.
RSpec.describe "Api::V1::Me", type: :request do
  self.use_transactional_tests = false

  def issue_token(professional:, organization:, scopes: %w[me:read], **extra)
    result = PersonalAccessTokens::Issue.call(
      professional: professional, organization: organization,
      name: "Test token #{SecureRandom.hex(3)}", scopes: scopes, **extra
    )
    [ result[:personal_access_token], result[:plaintext] ]
  end

  before do
    # Reset Rack::Attack cache so a previous spec's throttle state doesn't
    # bleed through; /me specs only make one or two requests per example.
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
  end

  before do
    AuditLog.delete_all
    PersonalAccessToken.unscoped.delete_all
    OrganizationMembership.delete_all
    Organization.delete_all
    Professional.delete_all
  end

  let!(:org) { create(:organization, name: "Acme") }
  let!(:pro) { create(:professional) }
  let!(:mem) { create(:organization_membership, professional: pro, organization: org, role: "owner") }

  describe "GET /api/v1/me" do
    it "returns 200 with identity + scope for a valid token" do
      _, plaintext = issue_token(professional: pro, organization: org, scopes: %w[me:read clients:write])

      get "/api/v1/me", headers: { "Authorization" => "Bearer #{plaintext}" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("me", "id")).to eq(pro.id)
      expect(body.dig("me", "email")).to eq(pro.email)
      expect(body.dig("me", "organization", "id")).to eq(org.id)
      expect(body.dig("me", "token", "scopes")).to eq(%w[me:read clients:write])
    end

    it "401s with the error envelope when Authorization is missing" do
      get "/api/v1/me"
      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)).to match("error" => hash_including("code" => "unauthenticated"))
    end

    it "401s on malformed Authorization" do
      get "/api/v1/me", headers: { "Authorization" => "Bearer not-a-pat" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "401s on unknown token id with a valid-looking prefix" do
      fake = "Bearer nuc_pat_#{SecureRandom.hex(16)}.#{SecureRandom.hex(16)}"
      get "/api/v1/me", headers: { "Authorization" => fake }
      expect(response).to have_http_status(:unauthorized)
    end

    it "401s after revocation (no caching — immediate effect)" do
      pat, plaintext = issue_token(professional: pro, organization: org)

      get "/api/v1/me", headers: { "Authorization" => "Bearer #{plaintext}" }
      expect(response).to have_http_status(:ok)

      PersonalAccessTokens::Revoke.call(personal_access_token: pat)

      get "/api/v1/me", headers: { "Authorization" => "Bearer #{plaintext}" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "401s once expires_at has passed" do
      pat, plaintext = issue_token(professional: pro, organization: org)
      pat.update_column(:expires_at, 1.minute.ago)

      get "/api/v1/me", headers: { "Authorization" => "Bearer #{plaintext}" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "ignores cookies entirely — no CSRF bypass surface" do
      # No Authorization header; only a cookie. Even if a browser session
      # is somehow present, /api/v1 must not treat it as authenticated.
      get "/api/v1/me", headers: { "Cookie" => "_session_id=fake" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "bumps last_used_at on each successful call" do
      pat, plaintext = issue_token(professional: pro, organization: org)
      pat.update_column(:last_used_at, nil)

      get "/api/v1/me", headers: { "Authorization" => "Bearer #{plaintext}" }
      expect(response).to have_http_status(:ok)
      expect(pat.reload.last_used_at).to be_within(10.seconds).of(Time.current)
    end
  end

  describe "cross-tenant silent isolation" do
    let!(:other_org) { create(:organization, name: "Other") }
    let!(:other_pro) { create(:professional) }
    let!(:other_mem) { create(:organization_membership, professional: other_pro, organization: other_org, role: "owner") }

    it "a token for org A cannot see org B's rows under its RLS block" do
      _, plaintext_a = issue_token(professional: pro, organization: org)

      # Plant a row in org B. This must be invisible to any query executed
      # under org A's tenant context — even if a controller forgot to add
      # a .where clause.
      AuditLog.create!(organization: other_org, action: "create",
                       auditable_type: "Organization", auditable_id: other_org.id,
                       audited_changes: {})

      # /me itself doesn't list AuditLogs, but we can introspect from
      # inside the authenticated context: while the request runs, the
      # tenant setting is pinned to org A, so AuditLog.count sees zero.
      got = nil
      allow_any_instance_of(Api::V1::MeController).to receive(:show).and_wrap_original do |m, *args|
        got = AuditLog.count # runs inside with_tenant_setting for org A
        m.call(*args)
      end

      get "/api/v1/me", headers: { "Authorization" => "Bearer #{plaintext_a}" }
      expect(response).to have_http_status(:ok)
      expect(got).to eq(0)
    end
  end
end
