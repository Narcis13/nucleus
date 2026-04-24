FactoryBot.define do
  factory :tag do
    association :organization
    sequence(:name) { |n| "tag-#{n}-#{SecureRandom.hex(2)}" }
    color { "#22c55e" }
  end
end
