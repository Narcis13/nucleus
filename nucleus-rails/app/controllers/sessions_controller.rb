class SessionsController < ApplicationController
  skip_before_action :set_current_context, only: :new
  skip_around_action :with_rls_tenant_setting, only: :new

  # Sessions are pure auth flow — there's no authorizable record in play, so
  # the global after_action :verify_authorized would otherwise raise here.
  def skip_pundit_verification?
    true
  end

  def new
    redirect_to dashboard_path if clerk_signed_in?
  end

  # Clerk owns the session lifecycle on the client (cookies are set + cleared
  # by Clerk's frontend SDK). Server-side we reset any Rails session state
  # and redirect to the sign-in page, which re-mounts Clerk's sign-in widget.
  # The widget calls Clerk.signOut client-side via the UserButton before the
  # user lands here; this endpoint is the server-side belt-and-braces.
  def destroy
    reset_session
    redirect_to sign_in_path, status: :see_other, notice: "Signed out."
  end
end
