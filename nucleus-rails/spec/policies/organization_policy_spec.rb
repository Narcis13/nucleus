require "rails_helper"

RSpec.describe OrganizationPolicy do
  subject { described_class.new(user, record) }

  let(:record)  { create(:organization) }
  let(:user)    { create(:professional) }

  context "owner of the record org" do
    let!(:mem) { create(:organization_membership, professional: user, organization: record, role: "owner") }
    around { |ex| as_current(professional: user, organization: record, membership: mem) { ex.run } }

    it { is_expected.to permit_actions(%i[show update]) }
    it { is_expected.to forbid_actions(%i[destroy]) }
  end

  context "member of the record org" do
    let!(:mem) { create(:organization_membership, professional: user, organization: record, role: "member") }
    around { |ex| as_current(professional: user, organization: record, membership: mem) { ex.run } }

    it { is_expected.to permit_actions(%i[show]) }
    it { is_expected.to forbid_actions(%i[update destroy]) }
  end

  context "member of a different org" do
    let(:other)  { create(:organization) }
    let!(:mem)   { create(:organization_membership, professional: user, organization: other, role: "owner") }
    around { |ex| as_current(professional: user, organization: other, membership: mem) { ex.run } }

    it { is_expected.to forbid_actions(%i[show update destroy]) }
  end

  describe "Scope#resolve" do
    it "returns only the active org" do
      active  = create(:organization)
      _other  = create(:organization)
      pro     = create(:professional)
      mem     = create(:organization_membership, professional: pro, organization: active, role: "owner")

      resolved = nil
      as_current(professional: pro, organization: active, membership: mem) do
        resolved = OrganizationPolicy::Scope.new(pro, Organization).resolve.to_a
      end
      expect(resolved).to eq([ active ])
    end

    it "returns none when no org is active" do
      pro = create(:professional)
      resolved = nil
      as_current(professional: pro) do
        resolved = OrganizationPolicy::Scope.new(pro, Organization).resolve
      end
      expect(resolved).to be_empty
    end
  end
end
