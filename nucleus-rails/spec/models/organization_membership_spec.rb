require "rails_helper"

RSpec.describe OrganizationMembership do
  describe "validations" do
    it "rejects unknown roles" do
      m = build(:organization_membership, role: "admin")
      expect(m).not_to be_valid
      expect(m.errors[:role]).to be_present
    end

    it "enforces one membership per (professional, organization) pair" do
      org = create(:organization)
      pro = create(:professional)
      create(:organization_membership, professional: pro, organization: org)
      dup = build(:organization_membership, professional: pro, organization: org)
      expect(dup).not_to be_valid
    end

    it "allows the same professional in two different orgs" do
      pro = create(:professional)
      create(:organization_membership, professional: pro, organization: create(:organization))
      second = build(:organization_membership, professional: pro, organization: create(:organization))
      expect(second).to be_valid
    end
  end

  describe "role predicates" do
    it "reflects the role string" do
      m = build(:organization_membership, role: "owner")
      expect(m.owner?).to be true
      expect(m.member?).to be false
      expect(m.client?).to be false
    end
  end
end
