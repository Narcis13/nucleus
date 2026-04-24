class ApplicationController < ActionController::Base
  include ClerkAuthenticatable
  include Pundit::Authorization
  include Pagy::Backend

  set_current_tenant_through_filter
  before_action :set_current_context
  around_action :with_rls_tenant_setting

  after_action :verify_authorized, unless: :skip_pundit_verification?

  rescue_from Pundit::NotAuthorizedError, with: :user_not_authorized

  # Pundit passes this as the first arg to policies and scopes. Our user
  # model is Professional, not a devise User.
  def pundit_user
    Current.professional
  end

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  private

  # Resolves Current.* for the request. Runs before the RLS around_action, so
  # it does its lookups as the `postgres` role (BYPASSRLS) — appropriate for
  # identity resolution, where we need to cross tenant boundaries to decide
  # which tenant is active. After this hook, the around_action opens the
  # RLS transaction using the resolved Current ids.
  def set_current_context
    return unless current_professional

    Current.professional = current_professional
    Current.request_meta = { ip: request.remote_ip, user_agent: request.user_agent }

    org = resolve_active_organization
    return unless org

    Current.organization = org
    Current.organization_membership =
      OrganizationMembership.find_by(professional_id: current_professional.id, organization_id: org.id)

    # acts_as_tenant is declared `acts_as_tenant :organization` on Client/Tag,
    # so the current tenant must be the Organization — passing the Professional
    # here makes the gem's before_validation overwrite organization_id with the
    # professional's id on every create, which then fails belongs_to :organization.
    set_current_tenant(org)
  end

  # Resolves the tenant org for this request.
  #
  # Two paths:
  #   1. A real Clerk organization is pinned on the professional (webhook
  #      populated clerk_org_id). Use that row — this is the broker/team
  #      path from the Rs3 plan.
  #   2. No Clerk org (solo professional, the default). Auto-provision a
  #      "personal" org on first login so solo users never see the
  #      "join an organization" message. The schema still carries
  #      organization_id on shared data; the UI just never surfaces it.
  def resolve_active_organization
    clerk_org_id = current_professional.clerk_org_id
    if clerk_org_id.present? && (org = Organization.find_by(clerk_org_id: clerk_org_id))
      return org
    end

    current_professional.ensure_personal_organization!
  end

  def with_rls_tenant_setting
    if Current.professional
      ApplicationRecord.with_tenant_setting(
        professional_id: Current.professional.id,
        organization_id: Current.organization&.id
      ) { yield }
    else
      yield
    end
  end

  # Pundit default-deny is enforced globally via after_action :verify_authorized.
  # Controllers that don't touch authorizable resources (sessions, health
  # checks) opt out by returning true here. Webhooks inherit from
  # ActionController::API and never reach this controller.
  def skip_pundit_verification?
    false
  end

  def user_not_authorized
    respond_to do |format|
      format.html { redirect_back_or_to(root_path, alert: "Not authorized.", status: :see_other) }
      format.json { render json: { error: { code: "forbidden", message: "Not authorized" } }, status: :forbidden }
    end
  end
end
