class Professional < ApplicationRecord
  # Roles:
  #   owner  — broker / team lead. Full CRUD inside their org.
  #   member — agent / trainer. Read org data, write only what they own.
  #   client — B2C-side end user. Limited self-service access.
  # Role lives on the professional for Rs2; Rs3 moves it onto
  # organization_memberships so a user can hold different roles per org.
  ROLES = %w[owner member client].freeze

  validates :clerk_user_id, presence: true, uniqueness: true
  validates :role, inclusion: { in: ROLES }

  ROLES.each do |r|
    define_method("#{r}?") { role == r }
  end

  # Upserts a Professional from a Clerk user-like object. Callers from the
  # HTTP session path pass `Clerk::Proxy#user` (the real SDK object);
  # callers from the webhook path pass ClerkUserPayload (a duck-typed
  # adapter). Both respond to :id, :first_name, :last_name, :email_addresses.
  #
  # `clerk_org_id` and `role` are only assigned when the caller explicitly
  # passes them — session provisioning doesn't know the org yet, and we
  # don't want to clobber role on a second login.
  def self.upsert_from_clerk!(clerk_user, clerk_org_id: :unset, role: :unset)
    find_or_initialize_by(clerk_user_id: clerk_user.id).tap do |p|
      p.email = clerk_user.email_addresses&.first&.email_address
      p.full_name = [ clerk_user.first_name, clerk_user.last_name ].compact.join(" ").presence
      p.clerk_org_id = clerk_org_id unless clerk_org_id == :unset
      p.role = role unless role == :unset || role.nil?
      p.save!
    end
  end
end
