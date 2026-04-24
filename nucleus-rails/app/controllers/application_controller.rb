class ApplicationController < ActionController::Base
  include ClerkAuthenticatable
  include Pundit::Authorization

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

    set_current_tenant(current_professional)

    org = resolve_active_organization
    return unless org

    Current.organization = org
    Current.organization_membership =
      OrganizationMembership.find_by(professional_id: current_professional.id, organization_id: org.id)
  end

  # Clerk's session carries the currently active organization. Until we wire
  # a first-class reader for it, fall back to the clerk_org_id the webhook
  # backfilled onto Professional. When Rs5+ needs per-request org switching,
  # swap this to read Clerk's session claims directly.
  def resolve_active_organization
    clerk_org_id = current_professional.clerk_org_id
    return nil if clerk_org_id.blank?

    Organization.find_by(clerk_org_id: clerk_org_id)
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
