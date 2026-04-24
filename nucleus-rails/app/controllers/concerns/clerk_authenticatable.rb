module ClerkAuthenticatable
  extend ActiveSupport::Concern

  included do
    helper_method :current_clerk_user, :current_professional, :clerk_signed_in?
  end

  private

  def clerk_proxy
    request.env["clerk"]
  end

  def clerk_signed_in?
    clerk_proxy&.user?
  end

  def current_clerk_user
    return nil unless clerk_signed_in?
    @current_clerk_user ||= clerk_proxy.user
  end

  def current_professional
    return nil unless current_clerk_user
    @current_professional ||= Professional.upsert_from_clerk!(current_clerk_user)
  end

  def require_clerk_user!
    redirect_to sign_in_path unless clerk_signed_in?
  end
end
