module Clients
  class ExportsController < ApplicationController
    layout "dashboard"

    before_action :require_clerk_user!
    before_action :require_active_organization!

    # CSV export. We intentionally don't include ActionController::Live: Rails
    # runs Live responses on a separate thread that checks out its own DB
    # connection, which doesn't inherit the SET LOCAL-scoped RLS GUCs/role
    # that the around_action establishes — so RLS silently returns zero rows.
    # Buffer the body instead; large-tenant streaming can come back later
    # once the tenant setting is pushed onto the per-connection layer.

    def show
      authorize Client, :export?

      scope = policy_scope(Client).reorder(created_at: :asc)
      scope = scope.ransack(params[:q]).result if params[:q].present?

      result = Clients::Export.call(scope: scope)
      body = result.rows.to_a.join

      send_data body,
        type: "text/csv; charset=utf-8",
        filename: "clients-#{Time.current.strftime('%Y%m%d')}.csv",
        disposition: "attachment"
    end

    private

    def require_active_organization!
      return if Current.organization.present?
      redirect_to dashboard_path, alert: "Join or create an organization first."
    end
  end
end
