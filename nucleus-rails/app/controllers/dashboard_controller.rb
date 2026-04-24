class DashboardController < ApplicationController
  layout "dashboard"

  before_action :require_clerk_user!

  def index
    authorize :dashboard, :show?
  end
end
