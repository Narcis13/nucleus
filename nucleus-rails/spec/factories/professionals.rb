FactoryBot.define do
  factory :professional do
    sequence(:clerk_user_id) { |n| "user_#{n}_#{SecureRandom.hex(4)}" }
    sequence(:email) { |n| "pro#{n}@example.com" }
    full_name { "Test Professional" }
    role { "owner" }
    clerk_org_id { nil }

    trait :owner  do role { "owner"  } end
    trait :member do role { "member" } end
    trait :client do role { "client" } end

    trait :in_org do
      sequence(:clerk_org_id) { |n| "org_#{n}_#{SecureRandom.hex(4)}" }
    end
  end
end
