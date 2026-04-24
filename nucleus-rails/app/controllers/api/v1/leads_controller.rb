module Api
  module V1
    class LeadsController < BaseController
      # /api/v1/leads — JSON mirror of LeadsController (HTML). Both call the
      # same service objects under app/services/leads/, so business logic
      # only lives in one place.
      #
      # Scopes:
      #   leads:read  — index, show, pipeline, activities
      #   leads:write — create, update, destroy, move, convert, mark_lost,
      #                 add_activity
      #
      # Cross-tenant lookups return 404 (not 403): the row is invisible
      # under RLS, mirrors the /me + clients pattern.

      READ_ACTIONS  = %i[index show pipeline activities].freeze
      WRITE_ACTIONS = %i[create update destroy move convert mark_lost add_activity].freeze

      before_action -> { require_scope!("leads:read") },  only: READ_ACTIONS
      before_action -> { require_scope!("leads:write") }, only: WRITE_ACTIONS
      before_action :load_lead, only: %i[show update destroy move convert mark_lost activities add_activity]

      # GET /api/v1/leads
      def index
        scope = Lead.where(organization_id: Current.organization.id).includes(:stage)
        scope = scope.active unless ActiveModel::Type::Boolean.new.cast(params[:include_converted])
        scope = scope.ransack(params[:q]).result if params[:q].present?
        scope = scope.reorder(resolved_order)

        pagy, leads = pagy(scope, limit: clamp_limit(params[:per_page]))
        set_pagination_headers(pagy)

        render json: { leads: Api::V1::LeadResource.new(leads).serializable_hash }
      end

      def show
        render json: { lead: Api::V1::LeadResource.new(@lead).serializable_hash }
      end

      # GET /api/v1/leads/pipeline — one-shot payload for a Kanban renderer:
      # stages + active leads. Ensures default stages exist on first call so
      # a fresh tenant can paint immediately.
      def pipeline
        LeadStages::EnsureDefaults.call(organization: Current.organization)
        stages = LeadStage.where(organization_id: Current.organization.id).ordered
        leads = Lead.where(organization_id: Current.organization.id).active.order(created_at: :desc)

        render json: {
          stages: Api::V1::LeadStageResource.new(stages).serializable_hash,
          leads: Api::V1::LeadResource.new(leads).serializable_hash
        }
      end

      def create
        result = Leads::Create.call(
          attrs: lead_params.except(:stage_id).to_h,
          stage_id: lead_params[:stage_id],
          actor: Current.professional,
          organization: Current.organization
        )
        return render_result_failure(result) if result.failure?
        render json: { lead: Api::V1::LeadResource.new(result.lead).serializable_hash }, status: :created
      end

      def update
        result = Leads::Update.call(lead: @lead, attrs: lead_params.to_h, actor: Current.professional)
        return render_result_failure(result) if result.failure?
        render json: { lead: Api::V1::LeadResource.new(result.lead).serializable_hash }
      end

      def destroy
        result = Leads::Destroy.call(lead: @lead, actor: Current.professional)
        return render_result_failure(result) if result.failure?
        head :no_content
      end

      # POST /api/v1/leads/:id/move  { stage_id: <uuid> }
      def move
        result = Leads::Move.call(lead: @lead, stage_id: params[:stage_id], actor: Current.professional)
        return render_result_failure(result) if result.failure?
        render json: { lead: Api::V1::LeadResource.new(result.lead).serializable_hash }
      end

      # POST /api/v1/leads/:id/convert — creates a client + archives the lead.
      def convert
        result = Leads::Convert.call(
          lead: @lead,
          actor: Current.professional,
          organization: Current.organization
        )
        return render_result_failure(result) if result.failure?
        render json: {
          lead: Api::V1::LeadResource.new(result.lead).serializable_hash,
          client: Api::V1::ClientResource.new(result.client).serializable_hash
        }
      end

      # POST /api/v1/leads/:id/mark_lost { reason?: string }
      def mark_lost
        result = Leads::MarkLost.call(lead: @lead, reason: params[:reason], actor: Current.professional)
        return render_result_failure(result) if result.failure?
        render json: { lead: Api::V1::LeadResource.new(result.lead).serializable_hash }
      end

      # GET /api/v1/leads/:id/activities
      def activities
        rows = @lead.activities.recent
        render json: { activities: Api::V1::LeadActivityResource.new(rows).serializable_hash }
      end

      # POST /api/v1/leads/:id/activities { activity: { type, description } }
      def add_activity
        payload = activity_params
        result = Leads::AddActivity.call(
          lead: @lead,
          activity_type: payload[:type],
          description: payload[:description],
          actor: Current.professional
        )
        return render_result_failure(result) if result.failure?
        render json: { activity: Api::V1::LeadActivityResource.new(result.activity).serializable_hash },
               status: :created
      end

      private

      def load_lead
        @lead = Lead.where(organization_id: Current.organization.id).find(params[:id])
      end

      def lead_params
        params.require(:lead).permit(:full_name, :email, :phone, :source, :score, :notes, :stage_id)
      end

      def activity_params
        raw = params[:activity] || params
        raw.permit(:type, :description)
      end

      def resolved_order
        raw = params[:sort].to_s
        return { created_at: :desc } if raw.blank?
        allowed = %w[full_name score stage_id created_at updated_at]
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
