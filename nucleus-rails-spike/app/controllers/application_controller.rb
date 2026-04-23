class ApplicationController < ActionController::Base
  include ClerkAuthenticatable

  set_current_tenant_through_filter
  before_action :set_current_professional_as_tenant
  around_action :with_rls_tenant_setting

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Changes to the importmap will invalidate the etag for HTML responses
  stale_when_importmap_changes

  private

  def set_current_professional_as_tenant
    set_current_tenant(current_professional) if current_professional
  end

  def with_rls_tenant_setting
    if current_professional
      ApplicationRecord.with_tenant_setting(current_professional.id) { yield }
    else
      yield
    end
  end
end
