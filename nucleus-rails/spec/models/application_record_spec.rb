require "rails_helper"

RSpec.describe ApplicationRecord, ".with_tenant_setting" do
  let(:professional_id) { SecureRandom.uuid }
  let(:organization_id) { SecureRandom.uuid }

  it "raises when neither id is given" do
    expect { described_class.with_tenant_setting { } }.to raise_error(ArgumentError)
    expect { described_class.with_tenant_setting(professional_id: "", organization_id: nil) { } }
      .to raise_error(ArgumentError)
  end

  it "sets app.professional_id when professional_id is provided" do
    observed = nil
    described_class.with_tenant_setting(professional_id: professional_id) do
      observed = ActiveRecord::Base.connection
                                   .select_value("SELECT current_setting('app.professional_id', true)")
    end
    expect(observed).to eq(professional_id)
  end

  it "sets app.organization_id when organization_id is provided" do
    observed = nil
    described_class.with_tenant_setting(organization_id: organization_id) do
      observed = ActiveRecord::Base.connection
                                   .select_value("SELECT current_setting('app.organization_id', true)")
    end
    expect(observed).to eq(organization_id)
  end

  it "sets both GUCs when both ids are provided" do
    pro_observed = nil
    org_observed = nil
    described_class.with_tenant_setting(professional_id: professional_id, organization_id: organization_id) do
      pro_observed = ActiveRecord::Base.connection.select_value("SELECT current_setting('app.professional_id', true)")
      org_observed = ActiveRecord::Base.connection.select_value("SELECT current_setting('app.organization_id', true)")
    end
    expect(pro_observed).to eq(professional_id)
    expect(org_observed).to eq(organization_id)
  end

  it "switches to the authenticated role inside the block" do
    inside_role = nil
    described_class.with_tenant_setting(professional_id: professional_id) do
      inside_role = ActiveRecord::Base.connection.select_value("SELECT current_user")
    end
    expect(inside_role).to eq("authenticated")
    # Production reset-after behavior (SET LOCAL scoped to the inner txn) isn't
    # observable here because RSpec's transactional fixtures open an outer txn
    # and SET LOCAL doesn't scope to savepoints. Covered by the non-transactional
    # tenancy_isolation spec.
  end
end
