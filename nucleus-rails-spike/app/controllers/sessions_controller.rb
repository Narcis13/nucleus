class SessionsController < ApplicationController
  def new
    redirect_to dashboard_path and return if clerk_signed_in?
  end
end
