module Api
  module V1
    class TagsController < BaseController
      before_action -> { require_scope!("clients:read") },  only: %i[index]
      before_action -> { require_scope!("clients:write") }, only: %i[create]

      def index
        tags = Tag.where(organization_id: Current.organization.id).order(:name)
        render json: { tags: Api::V1::TagResource.new(tags).serializable_hash }
      end

      def create
        result = Tags::Create.call(
          attrs: tag_params.to_h,
          actor: Current.professional,
          organization: Current.organization
        )
        return render_result_failure(result) if result.failure?
        render json: { tag: Api::V1::TagResource.new(result.tag).serializable_hash },
               status: :created
      end

      private

      def tag_params
        params.require(:tag).permit(:name, :color)
      end
    end
  end
end
