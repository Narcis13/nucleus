require "rails_helper"

RSpec.describe ClientPolicy, type: :policy do
  let(:org) { create(:organization) }
  let(:owner)  { create(:professional, :owner) }
  let(:member) { create(:professional, :member) }
  let(:client_user) { create(:professional, :client) }
  let(:client_row) { Client.new(organization: org, full_name: "Test") }

  describe "with owner in active org" do
    it "permits CRUD + bulk operations" do
      as_current(professional: owner, organization: org) do
        expect(described_class.new(owner, client_row)).to permit_actions(%i[index show create update destroy bulk_destroy import export])
      end
    end
  end

  describe "with member in active org" do
    it "permits CRUD (Rs5 — role split happens later)" do
      as_current(professional: member, organization: org) do
        expect(described_class.new(member, client_row)).to permit_actions(%i[index show create update destroy])
      end
    end
  end

  describe "with B2C client role" do
    it "forbids everything" do
      as_current(professional: client_user, organization: org) do
        expect(described_class.new(client_user, client_row)).to forbid_actions(%i[index show create update destroy bulk_destroy])
      end
    end
  end

  describe "without active organization" do
    it "forbids everything" do
      as_current(professional: owner, organization: nil) do
        expect(described_class.new(owner, client_row)).to forbid_actions(%i[index show create update destroy])
      end
    end
  end

  describe "record owned by another org" do
    it "forbids show/update/destroy on mismatched record" do
      other_org = create(:organization)
      other_client = Client.new(organization: other_org, full_name: "Foreign")
      as_current(professional: owner, organization: org) do
        expect(described_class.new(owner, other_client)).to forbid_actions(%i[show update destroy])
      end
    end
  end

  describe "Scope" do
    it "returns only rows in the active organization" do
      org_b = create(:organization)
      ApplicationRecord.transaction do
        Client.create!(organization: org, full_name: "mine")
        Client.create!(organization: org_b, full_name: "theirs")
      end
      as_current(professional: owner, organization: org) do
        resolved = described_class::Scope.new(owner, Client).resolve
        expect(resolved.pluck(:full_name)).to eq([ "mine" ])
      end
    end
  end
end
