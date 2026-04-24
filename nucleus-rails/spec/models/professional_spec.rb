require "rails_helper"

RSpec.describe Professional, type: :model do
  describe "validations" do
    subject { build(:professional) }

    it { is_expected.to validate_presence_of(:clerk_user_id) }
    it { is_expected.to validate_uniqueness_of(:clerk_user_id) }
    it { is_expected.to validate_inclusion_of(:role).in_array(Professional::ROLES) }
  end

  describe ".upsert_from_clerk!" do
    let(:clerk_user) do
      Struct.new(:id, :first_name, :last_name, :email_addresses).new(
        "user_abc",
        "Ada",
        "Lovelace",
        [ Struct.new(:email_address).new("ada@example.com") ]
      )
    end

    it "creates a new Professional with role=owner by default" do
      expect {
        described_class.upsert_from_clerk!(clerk_user)
      }.to change(described_class, :count).by(1)

      pro = described_class.find_by(clerk_user_id: "user_abc")
      expect(pro.email).to eq("ada@example.com")
      expect(pro.full_name).to eq("Ada Lovelace")
      expect(pro.role).to eq("owner")
      expect(pro.clerk_org_id).to be_nil
    end

    it "updates an existing Professional by clerk_user_id" do
      create(:professional, clerk_user_id: "user_abc", email: "old@example.com", role: "member")

      expect {
        described_class.upsert_from_clerk!(clerk_user)
      }.not_to change(described_class, :count)

      pro = described_class.find_by(clerk_user_id: "user_abc")
      expect(pro.email).to eq("ada@example.com")
      # Role preserved because the caller didn't pass one.
      expect(pro.role).to eq("member")
    end

    it "assigns clerk_org_id and role when explicitly passed" do
      described_class.upsert_from_clerk!(clerk_user, clerk_org_id: "org_1", role: "member")
      pro = described_class.find_by(clerk_user_id: "user_abc")
      expect(pro.clerk_org_id).to eq("org_1")
      expect(pro.role).to eq("member")
    end
  end

  describe "#ensure_personal_organization!" do
    let(:pro) { create(:professional, clerk_user_id: "user_solo", email: "s@example.com", full_name: "Solo Pro") }

    it "creates a personal org + owner membership on first call" do
      expect {
        pro.ensure_personal_organization!
      }.to change(Organization, :count).by(1)
       .and change(OrganizationMembership, :count).by(1)

      org = Organization.find_by(clerk_org_id: "personal_user_solo")
      expect(org).to be_present
      expect(org.name).to eq("Solo Pro")
      membership = OrganizationMembership.find_by(professional: pro, organization: org)
      expect(membership.role).to eq("owner")
    end

    it "is idempotent" do
      pro.ensure_personal_organization!
      expect {
        pro.ensure_personal_organization!
      }.to change(Organization, :count).by(0)
       .and change(OrganizationMembership, :count).by(0)
    end

    it "uses a 'personal_' prefix distinct from Clerk's 'org_' namespace" do
      org = pro.ensure_personal_organization!
      expect(org.clerk_org_id).to start_with("personal_")
      expect(org.clerk_org_id).not_to start_with("org_")
    end
  end

  describe "role predicates" do
    it "exposes owner?, member?, client?" do
      expect(build(:professional, :owner).owner?).to be true
      expect(build(:professional, :member).member?).to be true
      expect(build(:professional, :client).client?).to be true
      expect(build(:professional, :owner).member?).to be false
    end
  end
end
