module Clients
  class BulkController < ApplicationController
    layout "dashboard"

    before_action :require_clerk_user!
    before_action :require_active_organization!

    def destroy
      authorize Client, :bulk_destroy?
      ids = Array(params[:client_ids]).map(&:to_s).reject(&:blank?).uniq
      result = Clients::BulkDestroy.call(
        scope: policy_scope(Client),
        ids: ids,
        actor: Current.professional
      )

      notice = "Deleted #{result.destroyed.size} client#{"s" unless result.destroyed.size == 1}."
      notice += " #{result.missing.size} skipped (not found)." if result.missing.any?
      redirect_to clients_path, notice: notice, status: :see_other
    end

    private

    def require_active_organization!
      return if Current.organization.present?
      redirect_to dashboard_path, alert: "Join or create an organization first."
    end
  end
end
