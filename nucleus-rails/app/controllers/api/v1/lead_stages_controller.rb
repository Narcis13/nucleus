module Api
  module V1
    class LeadStagesController < BaseController
      # Stage CRUD for the pipeline. Read scope is `leads:read` because the
      # board can't render without stages; write scope is `leads:write`.

      before_action -> { require_scope!("leads:read") },  only: %i[index]
      before_action -> { require_scope!("leads:write") }, only: %i[create update destroy reorder]
      before_action :load_stage, only: %i[update destroy]

      def index
        LeadStages::EnsureDefaults.call(organization: Current.organization)
        stages = LeadStage.where(organization_id: Current.organization.id).ordered
        render json: { stages: Api::V1::LeadStageResource.new(stages).serializable_hash }
      end

      def create
        result = LeadStages::Create.call(
          attrs: stage_params.to_h,
          actor: Current.professional,
          organization: Current.organization
        )
        return render_result_failure(result) if result.failure?
        render json: { stage: Api::V1::LeadStageResource.new(result.stage).serializable_hash }, status: :created
      end

      def update
        result = LeadStages::Update.call(stage: @stage, attrs: stage_params.to_h, actor: Current.professional)
        return render_result_failure(result) if result.failure?
        render json: { stage: Api::V1::LeadStageResource.new(result.stage).serializable_hash }
      end

      def destroy
        result = LeadStages::Destroy.call(stage: @stage, actor: Current.professional)
        return render_result_failure(result) if result.failure?
        head :no_content
      end

      # POST /api/v1/lead_stages/reorder { ordered_ids: [...] }
      def reorder
        ids = Array(params[:ordered_ids]).map(&:to_s)
        result = LeadStages::Reorder.call(
          organization: Current.organization,
          ordered_ids: ids,
          ordered: params[:ordered],
          actor: Current.professional
        )
        return render_result_failure(result) if result.failure?
        render json: { stages: Api::V1::LeadStageResource.new(result.stages).serializable_hash }
      end

      private

      def load_stage
        @stage = LeadStage.where(organization_id: Current.organization.id).find(params[:id])
      end

      def stage_params
        params.require(:lead_stage).permit(:name, :color, :is_won, :is_lost)
      end
    end
  end
end
