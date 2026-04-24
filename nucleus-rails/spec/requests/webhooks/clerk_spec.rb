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
      expect(pro.role).to eq("owner")
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

  describe "organizationMembership.created" do
    it "sets clerk_org_id and role on the existing Professional" do
      pro = create(:professional, clerk_user_id: "user_abc", role: "owner")

      post_event({
        type: "organizationMembership.created",
        data: {
          role: "org:member",
          organization: { id: "org_123" },
          public_user_data: { user_id: "user_abc" }
        }
      })

      expect(response).to have_http_status(:ok)
      pro.reload
      expect(pro.clerk_org_id).to eq("org_123")
      expect(pro.role).to eq("member")
    end

    it "maps org:admin to owner" do
      pro = create(:professional, clerk_user_id: "user_abc", role: "member")

      post_event({
        type: "organizationMembership.created",
        data: {
          role: "org:admin",
          organization: { id: "org_123" },
          public_user_data: { user_id: "user_abc" }
        }
      })

      expect(pro.reload.role).to eq("owner")
    end
  end

  describe "organizationMembership.deleted" do
    it "clears clerk_org_id on the Professional" do
      pro = create(:professional, clerk_user_id: "user_abc", clerk_org_id: "org_123")

      post_event({
        type: "organizationMembership.deleted",
        data: { public_user_data: { user_id: "user_abc" } }
      })

      expect(pro.reload.clerk_org_id).to be_nil
    end
  end

  describe "organization.created" do
    it "returns 200 and does not create records (Rs3 introduces the Organization model)" do
      expect {
        post_event({ type: "organization.created", data: { id: "org_123", name: "Acme" } })
      }.not_to change(Professional, :count)
      expect(response).to have_http_status(:ok)
    end
  end
end
