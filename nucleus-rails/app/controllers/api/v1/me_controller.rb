module Api
  module V1
    class MeController < BaseController
      # GET /api/v1/me
      # Smallest possible endpoint that proves auth + tenant context + scope
      # surfacing work end-to-end. No scope requirement — any valid token
      # may call /me to discover its own identity, which matches how
      # GitHub's PAT /user endpoint behaves.

      def show
        render json: { me: Api::V1::MeResource.new(Current.professional).serializable_hash }
      end
    end
  end
end
