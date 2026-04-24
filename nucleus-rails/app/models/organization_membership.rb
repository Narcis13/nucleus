class OrganizationMembership < ApplicationRecord
  include Auditable

  # Roles:
  #   owner  — broker / team lead. Full CRUD inside the org.
  #   member — agent / trainer. Reads org data, writes what they own.
  #   client — B2C-side end user. Limited self-service.
  #
  # A professional may hold different roles in different orgs, so role lives
  # here rather than on Professional. The Rs2 column on Professional is now
  # a deprecated fallback (kept only to avoid a blocking migration).
  ROLES = %w[owner member client].freeze

  belongs_to :professional
  belongs_to :organization

  validates :role, inclusion: { in: ROLES }
  validates :professional_id, uniqueness: { scope: :organization_id }

  ROLES.each do |r|
    define_method("#{r}?") { role == r }
  end
end
