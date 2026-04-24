require "rails_helper"

RSpec.describe ApplicationRecord, ".with_tenant_setting" do
  let(:professional_id) { SecureRandom.uuid }

  it "raises when id is blank" do
    expect { described_class.with_tenant_setting(nil) { } }.to raise_error(ArgumentError)
    expect { described_class.with_tenant_setting("") { } }.to raise_error(ArgumentError)
  end

  it "sets the Postgres GUC app.professional_id for the duration of the block" do
    observed = nil
    described_class.with_tenant_setting(professional_id) do
      observed = ActiveRecord::Base.connection
                                   .select_value("SELECT current_setting('app.professional_id', true)")
    end
    expect(observed).to eq(professional_id)
  end

  it "switches to the authenticated role inside the block" do
    inside_role = nil
    described_class.with_tenant_setting(professional_id) do
      inside_role = ActiveRecord::Base.connection.select_value("SELECT current_user")
    end
    expect(inside_role).to eq("authenticated")
    # Production reset-after behavior (SET LOCAL scoped to the inner txn) isn't
    # observable here because RSpec's transactional fixtures open an outer txn
    # and SET LOCAL doesn't scope to savepoints. Covered by integration tests
    # that disable transactional fixtures in later sessions.
  end
end
