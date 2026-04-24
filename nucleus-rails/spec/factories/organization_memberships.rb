FactoryBot.define do
  factory :organization_membership do
    professional
    organization
    role { "owner" }

    trait :owner  do role { "owner"  } end
    trait :member do role { "member" } end
    trait :client do role { "client" } end
  end
end
