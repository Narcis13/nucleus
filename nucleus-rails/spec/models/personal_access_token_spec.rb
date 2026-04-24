require "rails_helper"

RSpec.describe PersonalAccessToken, type: :model do
  describe ".parse_presented" do
    it "returns nil for blank, wrong-prefix, or malformed input" do
      expect(PersonalAccessToken.parse_presented(nil)).to be_nil
      expect(PersonalAccessToken.parse_presented("")).to be_nil
      expect(PersonalAccessToken.parse_presented("Bearer foo.bar")).to be_nil
      expect(PersonalAccessToken.parse_presented("Bearer nuc_pat_XYZ.secret")).to be_nil
      expect(PersonalAccessToken.parse_presented("nuc_pat_#{"a" * 32}")).to be_nil # missing secret
    end

    it "accepts 'Bearer ' prefix and plain form, returning [uuid, secret]" do
      hex = "a" * 32
      uuid = PersonalAccessToken.hex_to_uuid(hex)
      expect(PersonalAccessToken.parse_presented("Bearer nuc_pat_#{hex}.s3cret")).to eq([ uuid, "s3cret" ])
      expect(PersonalAccessToken.parse_presented("nuc_pat_#{hex}.s3cret")).to eq([ uuid, "s3cret" ])
    end
  end

  describe "#has_scope?" do
    let(:pat) { build(:personal_access_token, scopes: %w[clients:read leads:write]) }

    it "matches an exact scope" do
      expect(pat.has_scope?("clients:read")).to be true
    end

    it "grants :read when :write is present for the same resource" do
      expect(pat.has_scope?("leads:read")).to be true
    end

    it "does not grant :write from :read" do
      expect(pat.has_scope?("clients:write")).to be false
    end

    it "rejects unrelated scopes" do
      expect(pat.has_scope?("billing:read")).to be false
    end
  end

  describe "#active? / #revoked? / #expired?" do
    it "is active when neither revoked nor expired" do
      pat = build(:personal_access_token)
      expect(pat).to be_active
    end

    it "is revoked after revoked_at is set" do
      pat = build(:personal_access_token, :revoked)
      expect(pat).to be_revoked
      expect(pat).not_to be_active
    end

    it "is expired once expires_at is in the past" do
      pat = build(:personal_access_token, :expired)
      expect(pat).to be_expired
      expect(pat).not_to be_active
    end
  end

  describe "#authenticate_secret" do
    it "is true for the secret originally passed to the digest and false otherwise" do
      secret = "correct-horse-battery-staple"
      pat = build(:personal_access_token, token_digest: BCrypt::Password.create(secret, cost: BCrypt::Engine::MIN_COST))
      expect(pat.authenticate_secret(secret)).to be true
      expect(pat.authenticate_secret("other")).to be false
    end
  end
end
