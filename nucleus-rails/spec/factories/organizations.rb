FactoryBot.define do
  factory :organization do
    sequence(:clerk_org_id) { |n| "org_#{n}_#{SecureRandom.hex(4)}" }
    sequence(:name) { |n| "Org ##{n}" }
    sequence(:slug) { |n| "org-#{n}-#{SecureRandom.hex(2)}" }
  end
end
