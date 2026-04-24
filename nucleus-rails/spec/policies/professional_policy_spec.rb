require "rails_helper"

RSpec.describe ProfessionalPolicy do
  subject { described_class.new(user, record) }

  let(:org)          { create(:organization) }
  let(:record)       { create(:professional) }
  let!(:record_mem)  { create(:organization_membership, professional: record, organization: org, role: "member") }

  context "as an owner in the same org" do
    let(:user)       { create(:professional) }
    let!(:user_mem)  { create(:organization_membership, professional: user, organization: org, role: "owner") }

    around { |ex| as_current(professional: user, organization: org, membership: user_mem) { ex.run } }

    it { is_expected.to permit_actions(%i[show update destroy]) }
  end

  context "as a member in the same org" do
    let(:user)       { create(:professional) }
    let!(:user_mem)  { create(:organization_membership, professional: user, organization: org, role: "member") }

    around { |ex| as_current(professional: user, organization: org, membership: user_mem) { ex.run } }

    it { is_expected.to permit_actions(%i[show]) }
    it { is_expected.to forbid_actions(%i[update destroy]) }
  end

  context "as the record itself" do
    let(:user) { record }

    # Acting on self is allowed even without an active org context (self-serve
    # profile page from the global dashboard).
    around { |ex| as_current(professional: user) { ex.run } }

    it { is_expected.to permit_actions(%i[show update]) }
    it { is_expected.to forbid_actions(%i[destroy]) }
  end

  context "as a user in a different org" do
    let(:other_org)  { create(:organization) }
    let(:user)       { create(:professional) }
    let!(:user_mem)  { create(:organization_membership, professional: user, organization: other_org, role: "owner") }

    around { |ex| as_current(professional: user, organization: other_org, membership: user_mem) { ex.run } }

    it { is_expected.to forbid_actions(%i[show update destroy]) }
  end

  context "with no user" do
    let(:user) { nil }

    it { is_expected.to forbid_actions(%i[show update destroy index create]) }
  end

  describe "Scope#resolve" do
    it "returns org peers for an owner" do
      owner = create(:professional)
      owner_mem = create(:organization_membership, professional: owner, organization: org, role: "owner")
      peer = create(:professional)
      create(:organization_membership, professional: peer, organization: org, role: "member")
      outsider = create(:professional)
      create(:organization_membership, professional: outsider, organization: create(:organization), role: "owner")

      resolved = nil
      as_current(professional: owner, organization: org, membership: owner_mem) do
        resolved = ProfessionalPolicy::Scope.new(owner, Professional).resolve.to_a
      end

      expect(resolved).to include(owner, peer)
      expect(resolved).not_to include(outsider)
    end

    it "returns self-only when no organization is active" do
      pro = create(:professional)
      create(:professional) # unrelated
      resolved = nil
      as_current(professional: pro) do
        resolved = ProfessionalPolicy::Scope.new(pro, Professional).resolve.to_a
      end
      expect(resolved).to eq([ pro ])
    end

    it "returns none for nil user" do
      expect(ProfessionalPolicy::Scope.new(nil, Professional).resolve).to be_empty
    end
  end
end
