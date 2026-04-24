FactoryBot.define do
  factory :audit_log do
    organization
    action { "create" }
    auditable_type { "Organization" }
    auditable_id { SecureRandom.uuid }
    audited_changes { {} }
  end
end
