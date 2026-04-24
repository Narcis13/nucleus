FactoryBot.define do
  factory :client do
    association :organization
    sequence(:full_name) { |n| "Client ##{n}" }
    sequence(:email)     { |n| "client#{n}@example.com" }
    status { "lead" }
  end
end
