require "rails_helper"

RSpec.describe ProfessionalPolicy do
  subject { described_class.new(user, record) }

  let(:record) { create(:professional, :in_org, role: "member") }

  context "as an owner in the same org" do
    let(:user) { create(:professional, role: "owner", clerk_org_id: record.clerk_org_id) }

    it { is_expected.to permit_actions(%i[show update]) }
    it { is_expected.to forbid_actions(%i[destroy]) } # owner can destroy only their own record
  end

  context "as the record's self" do
    let(:user) { record }

    it { is_expected.to permit_actions(%i[show update]) } # self-read/update always allowed
  end

  context "as a member in the same org" do
    let(:user) { create(:professional, role: "member", clerk_org_id: record.clerk_org_id) }

    it { is_expected.to permit_actions(%i[show]) }
    it { is_expected.to forbid_actions(%i[update destroy]) }
  end

  context "as a member in a different org" do
    let(:user) { create(:professional, role: "member", clerk_org_id: "org_other") }

    it { is_expected.to forbid_actions(%i[show update destroy]) }
  end

  context "as a client" do
    let(:user) { create(:professional, role: "client") }

    it { is_expected.to forbid_actions(%i[show update destroy]) }
  end

  context "with no user" do
    let(:user) { nil }

    it { is_expected.to forbid_actions(%i[show update destroy index create]) }
  end

  describe "Scope#resolve" do
    it "returns org peers for an owner" do
      owner = create(:professional, :in_org, role: "owner")
      peer  = create(:professional, role: "member", clerk_org_id: owner.clerk_org_id)
      other = create(:professional, :in_org, role: "owner")

      resolved = ProfessionalPolicy::Scope.new(owner, Professional).resolve
      expect(resolved).to include(owner, peer)
      expect(resolved).not_to include(other)
    end

    it "returns none for nil user" do
      expect(ProfessionalPolicy::Scope.new(nil, Professional).resolve).to be_empty
    end
  end

  # Custom matchers — lightweight since we don't rely on pundit-matchers gem.
  RSpec::Matchers.define :permit_actions do |actions|
    match { |policy| actions.all? { |a| policy.public_send("#{a}?") == true } }
    failure_message { |policy| "expected policy to permit #{actions}, got: " + actions.map { |a| [ a, policy.public_send("#{a}?") ] }.to_h.inspect }
  end

  RSpec::Matchers.define :forbid_actions do |actions|
    match { |policy| actions.all? { |a| !policy.public_send("#{a}?") } }
    failure_message { |policy| "expected policy to forbid #{actions}, got: " + actions.map { |a| [ a, policy.public_send("#{a}?") ] }.to_h.inspect }
  end
end
