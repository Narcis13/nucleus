module Api
  module V1
    class ClientsController < BaseController
      # /api/v1/clients — JSON mirror of ClientsController (HTML). Both call
      # the same service objects, so business logic lives in one place.
      #
      # Scopes:
      #   clients:read  — index, show
      #   clients:write — create, update, destroy, bulk_destroy
      #
      # Cross-tenant lookups return 404 (not 403) because the row is
      # invisible under RLS — mirrors the /me pattern.

      before_action -> { require_scope!("clients:read") },  only: %i[index show]
      before_action -> { require_scope!("clients:write") }, only: %i[create update destroy bulk_destroy]
      before_action :load_client, only: %i[show update destroy]

      def index
        scope = Client.where(organization_id: Current.organization.id)
                      .includes(:tags)
        scope = scope.ransack(params[:q]).result if params[:q].present?
        scope = scope.reorder(resolved_order)

        pagy, clients = pagy(scope, limit: clamp_limit(params[:per_page]))
        set_pagination_headers(pagy)

        render json: { clients: Api::V1::ClientResource.new(clients).serializable_hash }
      end

      def show
        render json: { client: Api::V1::ClientResource.new(@client).serializable_hash }
      end

      def create
        result = Clients::Create.call(
          attrs: client_params.to_h,
          actor: Current.professional,
          organization: Current.organization
        )

        return render_result_failure(result) if result.failure?
        render json: { client: Api::V1::ClientResource.new(result.client).serializable_hash },
               status: :created
      end

      def update
        result = Clients::Update.call(
          client: @client,
          attrs: client_params.to_h,
          actor: Current.professional
        )

        return render_result_failure(result) if result.failure?
        render json: { client: Api::V1::ClientResource.new(result.client).serializable_hash }
      end

      def destroy
        result = Clients::Destroy.call(client: @client, actor: Current.professional)
        return render_result_failure(result) if result.failure?
        head :no_content
      end

      def bulk_destroy
        scope = Client.where(organization_id: Current.organization.id)
        result = Clients::BulkDestroy.call(
          scope: scope,
          ids: Array(params[:client_ids]),
          actor: Current.professional
        )

        render json: {
          destroyed: result.destroyed,
          missing: result.missing
        }
      end

      private

      def load_client
        # Client.find (inside with_tenant_setting) returns RecordNotFound for
        # other tenants because RLS hides the row. Api::ErrorHandling
        # converts RecordNotFound to a 404 envelope.
        @client = Client.where(organization_id: Current.organization.id).find(params[:id])
      end

      def client_params
        params.require(:client).permit(
          :full_name, :email, :phone, :status, :source, :notes, :assigned_professional_id
        )
      end

      # Accept ?sort=full_name,-created_at style. The dash prefix flips order.
      # Unknown columns fall back to default so a typo can't 500 the request.
      def resolved_order
        raw = params[:sort].to_s
        return { created_at: :desc } if raw.blank?

        allowed = %w[full_name email status source created_at updated_at]
        raw.split(",").map(&:strip).reject(&:blank?).each_with_object({}) do |token, hsh|
          direction = token.start_with?("-") ? :desc : :asc
          col = token.delete_prefix("-")
          hsh[col.to_sym] = direction if allowed.include?(col)
        end.then { |h| h.empty? ? { created_at: :desc } : h }
      end

      def clamp_limit(raw)
        limit = raw.to_i
        return 25 if limit <= 0
        [ limit, 100 ].min
      end
    end
  end
end
