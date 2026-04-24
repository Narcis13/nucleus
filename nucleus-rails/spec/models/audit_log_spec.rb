require "rails_helper"

RSpec.describe AuditLog do
  describe "validations + associations" do
    it "requires action, auditable_type, auditable_id" do
      log = described_class.new(organization: create(:organization))
      expect(log).not_to be_valid
      expect(log.errors[:action]).to be_present
      expect(log.errors[:auditable_type]).to be_present
      expect(log.errors[:auditable_id]).to be_present
    end

    it "accepts a nil actor (system events)" do
      log = build(:audit_log, actor: nil)
      expect(log).to be_valid
    end
  end

  describe "#readonly?" do
    it "blocks updates after insert" do
      log = create(:audit_log, auditable_type: "Organization", auditable_id: SecureRandom.uuid)
      expect { log.update!(action: "tampered") }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end
  end
end
