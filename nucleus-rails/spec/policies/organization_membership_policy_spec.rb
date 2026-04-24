require "rails_helper"

RSpec.describe OrganizationMembershipPolicy do
  subject { described_class.new(user, record) }

  let(:org)  { create(:organization) }
  let(:peer) { create(:professional) }
  let!(:record) { create(:organization_membership, professional: peer, organization: org, role: "member") }
  let(:user) { create(:professional) }

  context "owner acting on a peer membership" do
    let!(:user_mem) { create(:organization_membership, professional: user, organization: org, role: "owner") }
    around { |ex| as_current(professional: user, organization: org, membership: user_mem) { ex.run } }

    it { is_expected.to permit_actions(%i[show create update destroy]) }
  end

  context "owner acting on their own membership" do
    let!(:user_mem) { create(:organization_membership, professional: user, organization: org, role: "owner") }
    let(:record)    { user_mem }
    around { |ex| as_current(professional: user, organization: org, membership: user_mem) { ex.run } }

    it "can see it but cannot update or destroy self" do
      expect(subject).to permit_actions(%i[show])
      expect(subject).to forbid_actions(%i[update destroy])
    end
  end

  context "member viewing their own membership" do
    let!(:user_mem) { create(:organization_membership, professional: user, organization: org, role: "member") }
    let(:record)    { user_mem }
    around { |ex| as_current(professional: user, organization: org, membership: user_mem) { ex.run } }

    it { is_expected.to permit_actions(%i[show]) }
    it { is_expected.to forbid_actions(%i[create update destroy]) }
  end

  context "member viewing a peer's membership" do
    let!(:user_mem) { create(:organization_membership, professional: user, organization: org, role: "member") }
    around { |ex| as_current(professional: user, organization: org, membership: user_mem) { ex.run } }

    it { is_expected.to forbid_actions(%i[show create update destroy]) }
  end

  describe "Scope#resolve" do
    it "owner sees every membership in the org" do
      owner     = create(:professional)
      owner_mem = create(:organization_membership, professional: owner, organization: org, role: "owner")
      peer_mem  = create(:organization_membership, professional: create(:professional), organization: org, role: "member")
      _outside  = create(:organization_membership, professional: create(:professional), organization: create(:organization), role: "owner")

      resolved = nil
      as_current(professional: owner, organization: org, membership: owner_mem) do
        resolved = OrganizationMembershipPolicy::Scope.new(owner, OrganizationMembership).resolve.to_a
      end
      # +record+ is an outer let! that also lives in +org+; include it.
      expect(resolved).to contain_exactly(record, owner_mem, peer_mem)
    end

    it "member sees only their own membership" do
      pro     = create(:professional)
      pro_mem = create(:organization_membership, professional: pro, organization: org, role: "member")
      _peer   = create(:organization_membership, professional: create(:professional), organization: org, role: "member")

      resolved = nil
      as_current(professional: pro, organization: org, membership: pro_mem) do
        resolved = OrganizationMembershipPolicy::Scope.new(pro, OrganizationMembership).resolve.to_a
      end
      expect(resolved).to eq([ pro_mem ])
    end
  end
end
