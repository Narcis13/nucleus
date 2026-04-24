FactoryBot.define do
  factory :personal_access_token do
    professional
    organization
    sequence(:name) { |n| "Token ##{n}" }
    scopes { %w[me:read] }

    transient do
      secret { SecureRandom.hex(PersonalAccessToken::SECRET_BYTES) }
    end

    token_digest { BCrypt::Password.create(secret, cost: BCrypt::Engine::MIN_COST) }

    trait :revoked do
      revoked_at { 1.minute.ago }
    end

    trait :expired do
      expires_at { 1.hour.ago }
    end

    # Returns the PAT with its .plaintext accessor populated, ready to be
    # used as a Bearer header in a request spec.
    initialize_with { new(attributes) }
    after(:build) do |pat, evaluator|
      pat.plaintext = PersonalAccessToken.present_token(
        pat.id || SecureRandom.uuid,
        evaluator.secret
      )
    end
    # On save, re-derive the plaintext with the actual id.
    after(:create) do |pat, evaluator|
      pat.plaintext = PersonalAccessToken.present_token(pat.id, evaluator.secret)
    end
  end
end
