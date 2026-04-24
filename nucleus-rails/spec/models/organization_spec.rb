require "rails_helper"

RSpec.describe Organization do
  describe "validations" do
    it "requires clerk_org_id" do
      org = described_class.new(name: "Acme")
      expect(org).not_to be_valid
      expect(org.errors[:clerk_org_id]).to be_present
    end

    it "enforces uniqueness of clerk_org_id" do
      create(:organization, clerk_org_id: "org_abc")
      dup = build(:organization, clerk_org_id: "org_abc")
      expect(dup).not_to be_valid
    end
  end

  describe ".upsert_from_clerk!" do
    it "creates a new row on first sight" do
      expect {
        described_class.upsert_from_clerk!(id: "org_zzz", name: "Zeta", slug: "zeta")
      }.to change(described_class, :count).by(1)

      org = described_class.find_by(clerk_org_id: "org_zzz")
      expect(org.name).to eq("Zeta")
      expect(org.slug).to eq("zeta")
    end

    it "updates an existing row on second sight" do
      create(:organization, clerk_org_id: "org_same", name: "Old")
      described_class.upsert_from_clerk!(id: "org_same", name: "New", slug: "new")
      expect(described_class.find_by(clerk_org_id: "org_same").name).to eq("New")
    end

    it "accepts string-keyed payloads too" do
      described_class.upsert_from_clerk!("id" => "org_str", "name" => "String Keys")
      expect(described_class.find_by(clerk_org_id: "org_str").name).to eq("String Keys")
    end

    it "raises without a clerk org id" do
      expect { described_class.upsert_from_clerk!(name: "No ID") }.to raise_error(ArgumentError)
    end
  end
end
