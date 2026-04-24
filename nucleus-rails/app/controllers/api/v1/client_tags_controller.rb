module Api
  module V1
    class ClientTagsController < BaseController
      # POST   /api/v1/clients/:client_id/tags  — attach tag_id from body
      # DELETE /api/v1/clients/:client_id/tags/:id — detach

      before_action -> { require_scope!("clients:write") }
      before_action :load_client
      before_action :load_tag

      def create
        result = Clients::AttachTag.call(client: @client, tag: @tag, actor: Current.professional)
        return render_result_failure(result) if result.failure?
        render json: { client_tag: { client_id: @client.id, tag_id: @tag.id } }, status: :created
      end

      def destroy
        result = Clients::DetachTag.call(client: @client, tag: @tag, actor: Current.professional)
        return render_result_failure(result) if result.failure?
        head :no_content
      end

      private

      def load_client
        @client = Client.where(organization_id: Current.organization.id).find(params[:client_id])
      end

      def load_tag
        tag_id = params[:id] || params[:tag_id] || params.dig(:tag, :id)
        @tag = Tag.where(organization_id: Current.organization.id).find(tag_id) if tag_id.present?
        render_api_error(code: :invalid, status: :unprocessable_content, message: "tag_id required") unless @tag
      end
    end
  end
end
