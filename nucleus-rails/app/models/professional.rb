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

  # Returns (creating if needed) a 1:1 "personal" Organization + owner
  # membership for this professional. Nucleus is a solo-pro product; the
  # org layer exists so shared data (clients, leads, services) has a
  # tenancy key that can later grow into a brokerage/studio, but solo
  # users never see it.
  #
  # The synthetic clerk_org_id lives in a "personal_*" namespace distinct
  # from Clerk's real "org_*" ids, so if the user later creates or joins
  # a Clerk organization the webhook inserts a separate row — no
  # collision, no migration needed.
  #
  # Must be called from the postgres (BYPASSRLS) path — i.e. before the
  # request's RLS around_action opens its transaction. set_current_context
  # satisfies that.
  def ensure_personal_organization!
    synthetic_id = "personal_#{clerk_user_id}"

    Organization.transaction do
      org = Organization.find_by(clerk_org_id: synthetic_id) ||
            Organization.create!(
              clerk_org_id: synthetic_id,
              name: full_name.presence || email.presence || "Personal workspace"
            )
      OrganizationMembership.find_by(professional_id: id, organization_id: org.id) ||
        OrganizationMembership.create!(professional: self, organization: org, role: "owner")
      org
    end
  rescue ActiveRecord::RecordNotUnique
    # Concurrent first-login race: another request won the insert. The
    # next lookup will find the winner's row.
    retry
  end
end
