module Clients
  class ExportsController < ApplicationController
    layout "dashboard"

    before_action :require_clerk_user!
    before_action :require_active_organization!

    # Streaming CSV. ActionController::Live lets us start the response body
    # before the full result set has been built, which keeps memory flat for
    # large exports. The `Last-Modified` header is a nod to the Rs5 plan
    # note — it also makes browsers' "download again?" prompt behave.
    include ActionController::Live

    def show
      authorize Client, :export?

      scope = policy_scope(Client).reorder(created_at: :asc)
      scope = scope.ransack(params[:q]).result if params[:q].present?

      response.headers["Content-Type"] = "text/csv; charset=utf-8"
      response.headers["Content-Disposition"] = %(attachment; filename="clients-#{Time.current.strftime('%Y%m%d')}.csv")
      response.headers["Last-Modified"] = Time.current.httpdate
      response.headers["Cache-Control"] = "no-cache"
      response.headers["X-Accel-Buffering"] = "no"

      result = Clients::Export.call(scope: scope)
      result.rows.each { |line| response.stream.write(line) }
    rescue IOError
      # Client disconnected; nothing to do.
      nil
    ensure
      response.stream.close
    end

    private

    def require_active_organization!
      return if Current.organization.present?
      redirect_to dashboard_path, alert: "Join or create an organization first."
    end
  end
end
