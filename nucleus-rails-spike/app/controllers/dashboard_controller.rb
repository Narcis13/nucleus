class DashboardController < ApplicationController
  before_action :require_clerk_user!

  def index
  end
end
