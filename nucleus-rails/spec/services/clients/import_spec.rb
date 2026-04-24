require "rails_helper"
require "csv"
require "tempfile"

RSpec.describe Clients::Import do
  self.use_transactional_tests = false

  before do
    AuditLog.delete_all
    ClientTag.delete_all
    Client.unscoped.delete_all
    Tag.unscoped.delete_all
    OrganizationMembership.delete_all
    Organization.delete_all
    Professional.delete_all
  end

  let!(:org) { create(:organization) }
  let!(:pro) { create(:professional) }

  def build_csv(rows)
    tmp = Tempfile.new([ "clients", ".csv" ])
    CSV.open(tmp.path, "w") do |csv|
      csv << %w[full_name email phone status source notes]
      rows.each { |r| csv << r }
    end
    tmp
  end

  it "dry-runs and reports per-row validation errors" do
    file = build_csv([
      [ "Alice", "alice@example.com", "555-0001", "lead",    "web",     "" ],
      [ "",      "bob@example.com",   "555-0002", "lead",    "referral", "" ],
      [ "Carol", "not-an-email",      "",         "unknown", "",         "" ]
    ])

    Current.organization = org
    result = described_class.call(io: file, organization: org, actor: pro, dry_run: true)
    file.close; file.unlink

    expect(result).to be_success
    expect(result.committed).to eq(false)
    expect(result.valid_count).to eq(1)
    expect(result.invalid_count).to eq(2)
    invalid = result.rows.reject(&:valid?)
    expect(invalid.flat_map { |r| r.errors.keys }).to include(:full_name, :status)
  ensure
    Current.reset
  end

  it "commits valid rows when dry_run is false, skipping invalid ones" do
    file = build_csv([
      [ "Alice", "a@example.com", "", "lead",   "web", "" ],
      [ "",      "b@example.com", "", "lead",   "",    "" ],
      [ "Carol", "c@example.com", "", "active", "",    "" ]
    ])

    Current.organization = org
    result = described_class.call(io: file, organization: org, actor: pro, dry_run: false)
    file.close; file.unlink

    expect(result).to be_success
    expect(result.committed).to eq(true)
    expect(result.created_count).to eq(2)
    expect(Client.where(organization: org).pluck(:full_name).sort).to eq(%w[Alice Carol])
  ensure
    Current.reset
  end

  it "imports a 1,000-row file in under 10 seconds (plan verification)" do
    rows = 1_000.times.map { |i| [ "Name#{i}", "user#{i}@example.com", "", "lead", "seed", "" ] }
    file = build_csv(rows)

    Current.organization = org
    started = Time.current
    result = described_class.call(io: file, organization: org, actor: pro, dry_run: false)
    elapsed = Time.current - started
    file.close; file.unlink

    expect(result).to be_success
    expect(result.created_count).to eq(1_000)
    expect(elapsed).to be < 10.0
  ensure
    Current.reset
  end
end
