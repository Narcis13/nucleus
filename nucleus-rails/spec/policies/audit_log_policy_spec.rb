require "rails_helper"

RSpec.describe AuditLogPolicy do
  subject { described_class.new(user, record) }

  let(:org)    { create(:organization) }
  let(:user)   { create(:professional) }
  let(:record) { create(:audit_log, organization: org, auditable_type: "Organization", auditable_id: org.id) }

  context "owner in the same org" do
    let!(:mem) { create(:organization_membership, professional: user, organization: org, role: "owner") }
    around { |ex| as_current(professional: user, organization: org, membership: mem) { ex.run } }

    it { is_expected.to permit_actions(%i[index show]) }
    it { is_expected.to forbid_actions(%i[create update destroy]) }
  end

  context "member in the same org" do
    let!(:mem) { create(:organization_membership, professional: user, organization: org, role: "member") }
    around { |ex| as_current(professional: user, organization: org, membership: mem) { ex.run } }

    it { is_expected.to forbid_actions(%i[index show create update destroy]) }
  end

  context "viewing a log from a different org" do
    let(:other_org) { create(:organization) }
    let(:record)    { create(:audit_log, organization: other_org, auditable_type: "Organization", auditable_id: other_org.id) }
    let!(:mem)      { create(:organization_membership, professional: user, organization: org, role: "owner") }
    around { |ex| as_current(professional: user, organization: org, membership: mem) { ex.run } }

    it "index? permits (owner can see their own org's index), show? denies the foreign record" do
      expect(subject.index?).to be true
      expect(subject.show?).to be false
    end
  end

  describe "Scope#resolve" do
    it "returns org's logs for an owner" do
      owner = create(:professional)
      mem   = create(:organization_membership, professional: owner, organization: org, role: "owner")
      mine  = create(:audit_log, organization: org,            auditable_type: "Organization", auditable_id: SecureRandom.uuid)
      other = create(:audit_log, organization: create(:organization), auditable_type: "Organization", auditable_id: SecureRandom.uuid)

      resolved = nil
      as_current(professional: owner, organization: org, membership: mem) do
        resolved = AuditLogPolicy::Scope.new(owner, AuditLog).resolve.to_a
      end
      expect(resolved).to include(mine)
      expect(resolved).not_to include(other)
    end

    it "returns none for a non-owner" do
      pro = create(:professional)
      mem = create(:organization_membership, professional: pro, organization: org, role: "member")
      _log = create(:audit_log, organization: org, auditable_type: "Organization", auditable_id: SecureRandom.uuid)

      resolved = nil
      as_current(professional: pro, organization: org, membership: mem) do
        resolved = AuditLogPolicy::Scope.new(pro, AuditLog).resolve
      end
      expect(resolved).to be_empty
    end
  end
end
