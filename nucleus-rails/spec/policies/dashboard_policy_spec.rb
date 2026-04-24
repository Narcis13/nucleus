require "rails_helper"

RSpec.describe DashboardPolicy do
  it "permits any authenticated professional" do
    pro = create(:professional)
    expect(described_class.new(pro, :dashboard).show?).to be true
  end

  it "denies an anonymous visitor" do
    expect(described_class.new(nil, :dashboard).show?).to be false
  end
end
