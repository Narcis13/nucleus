require "rails_helper"
require "svix"

RSpec.describe "Webhooks::Clerk", type: :request do
  let(:secret)  { "whsec_" + Base64.strict_encode64(SecureRandom.bytes(24)) }
  let(:svix_id) { "msg_#{SecureRandom.hex(8)}" }
  let(:ts)      { Time.now.to_i.to_s }

  around do |example|
    previous = ENV["CLERK_WEBHOOK_SECRET"]
    ENV["CLERK_WEBHOOK_SECRET"] = secret
    example.run
  ensure
    ENV["CLERK_WEBHOOK_SECRET"] = previous
  end

  def signed_headers(payload)
    signer = Svix::Webhook.new(secret)
    signature = signer.sign(svix_id, ts, payload)
    {
      "svix-id" => svix_id,
      "svix-timestamp" => ts,
      "svix-signature" => signature,
      "CONTENT_TYPE" => "application/json"
    }
  end

  def post_event(event_hash, override_headers: nil)
    payload = event_hash.to_json
    hdrs = override_headers || signed_headers(payload)
    post "/webhooks/clerk", params: payload, headers: hdrs
  end

  describe "verification" do
    it "rejects an unsigned request" do
      post "/webhooks/clerk", params: { type: "user.created" }.to_json,
                              headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:bad_request)
    end

    it "rejects a request with an invalid signature" do
      payload = { type: "user.created", data: {} }.to_json
      bad_headers = signed_headers(payload).merge("svix-signature" => "v1,bogus")
      post "/webhooks/clerk", params: payload, headers: bad_headers
      expect(response).to have_http_status(:bad_request)
    end

    it "refuses when CLERK_WEBHOOK_SECRET is the placeholder" do
      ENV["CLERK_WEBHOOK_SECRET"] = "whsec_placeholder"
      post "/webhooks/clerk", params: { type: "user.created" }.to_json,
                              headers: { "CONTENT_TYPE" => "application/json" }
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "user.created" do
    it "creates a Professional" do
      expect {
        post_event({
          type: "user.created",
          data: {
            id: "user_abc",
            first_name: "Ada",
            last_name: "Lovelace",
            email_addresses: [ { email_address: "ada@example.com" } ]
          }
        })
      }.to change(Professional, :count).by(1)

      expect(response).to have_http_status(:ok)
      pro = Professional.find_by(clerk_user_id: "user_abc")
      expect(pro.email).to eq("ada@example.com")
      expect(pro.full_name).to eq("Ada Lovelace")
    end
  end

  describe "user.deleted" do
    it "destroys the matching Professional" do
      create(:professional, clerk_user_id: "user_abc")
      expect {
        post_event({ type: "user.deleted", data: { id: "user_abc" } })
      }.to change(Professional, :count).by(-1)
    end
  end

  describe "organization.created" do
    it "creates an Organization row" do
      expect {
        post_event({
          type: "organization.created",
          data: { id: "org_123", name: "Acme", slug: "acme" }
        })
      }.to change(Organization, :count).by(1)

      expect(response).to have_http_status(:ok)
      org = Organization.find_by(clerk_org_id: "org_123")
      expect(org.name).to eq("Acme")
      expect(org.slug).to eq("acme")
    end
  end

  describe "organization.updated" do
    it "updates an existing Organization row" do
      create(:organization, clerk_org_id: "org_123", name: "Old")
      post_event({ type: "organization.updated", data: { id: "org_123", name: "New" } })
      expect(Organization.find_by(clerk_org_id: "org_123").name).to eq("New")
    end
  end

  describe "organization.deleted" do
    it "destroys the Organization row" do
      create(:organization, clerk_org_id: "org_123")
      expect {
        post_event({ type: "organization.deleted", data: { id: "org_123" } })
      }.to change(Organization, :count).by(-1)
    end
  end

  describe "organizationMembership.created" do
    it "creates an OrganizationMembership and upserts the Organization" do
      pro = create(:professional, clerk_user_id: "user_abc")

      expect {
        post_event({
          type: "organizationMembership.created",
          data: {
            role: "org:member",
            organization: { id: "org_123", name: "Acme" },
            public_user_data: { user_id: "user_abc" }
          }
        })
      }.to change(OrganizationMembership, :count).by(1)
       .and change(Organization, :count).by(1)

      expect(response).to have_http_status(:ok)
      org = Organization.find_by(clerk_org_id: "org_123")
      membership = OrganizationMembership.find_by(professional_id: pro.id, organization_id: org.id)
      expect(membership.role).to eq("member")
      # Rs2 back-compat denormalization
      expect(pro.reload.clerk_org_id).to eq("org_123")
      expect(pro.reload.role).to eq("member")
    end

    it "maps org:admin to owner" do
      pro = create(:professional, clerk_user_id: "user_abc")
      post_event({
        type: "organizationMembership.created",
        data: {
          role: "org:admin",
          organization: { id: "org_123" },
          public_user_data: { user_id: "user_abc" }
        }
      })
      org = Organization.find_by(clerk_org_id: "org_123")
      expect(OrganizationMembership.find_by(professional_id: pro.id, organization_id: org.id).role).to eq("owner")
    end
  end

  describe "organizationMembership.deleted" do
    it "destroys the matching membership and clears Professional.clerk_org_id" do
      pro = create(:professional, clerk_user_id: "user_abc", clerk_org_id: "org_123")
      org = create(:organization, clerk_org_id: "org_123")
      create(:organization_membership, professional: pro, organization: org)

      expect {
        post_event({
          type: "organizationMembership.deleted",
          data: {
            organization: { id: "org_123" },
            public_user_data: { user_id: "user_abc" }
          }
        })
      }.to change(OrganizationMembership, :count).by(-1)

      expect(pro.reload.clerk_org_id).to be_nil
    end

    it "doesn't stomp a second org the user still belongs to" do
      pro = create(:professional, clerk_user_id: "user_abc", clerk_org_id: "org_stay")
      org_go   = create(:organization, clerk_org_id: "org_go")
      org_stay = create(:organization, clerk_org_id: "org_stay")
      create(:organization_membership, professional: pro, organization: org_go)
      create(:organization_membership, professional: pro, organization: org_stay)

      post_event({
        type: "organizationMembership.deleted",
        data: {
          organization: { id: "org_go" },
          public_user_data: { user_id: "user_abc" }
        }
      })

      expect(pro.reload.clerk_org_id).to eq("org_stay")
      expect(OrganizationMembership.where(professional_id: pro.id).pluck(:organization_id))
        .to eq([ org_stay.id ])
    end
  end
end
