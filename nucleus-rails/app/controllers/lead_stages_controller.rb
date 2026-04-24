class LeadStagesController < ApplicationController
  layout "dashboard"

  before_action :require_clerk_user!
  before_action :require_active_organization!
  before_action :load_stage, only: %i[update destroy]

  def create
    authorize LeadStage
    result = LeadStages::Create.call(
      attrs: stage_params,
      actor: Current.professional,
      organization: Current.organization
    )
    if result.success?
      broadcast_stage_upsert(result.stage)
      redirect_to leads_path, notice: "Stage added."
    else
      redirect_to leads_path, alert: friendly_failure(result)
    end
  end

  def update
    authorize @stage
    result = LeadStages::Update.call(stage: @stage, attrs: stage_params, actor: Current.professional)
    if result.success?
      broadcast_stage_upsert(result.stage)
      redirect_to leads_path, notice: "Stage updated."
    else
      redirect_to leads_path, alert: friendly_failure(result)
    end
  end

  def reorder
    authorize LeadStage, :reorder?
    ids = Array(params[:ordered_ids]).map(&:to_s).reject(&:blank?)
    result = LeadStages::Reorder.call(
      organization: Current.organization,
      ordered_ids: ids,
      actor: Current.professional
    )
    if result.success?
      respond_to do |format|
        format.json { render json: { ok: true, stages: result.stages.map { |s| { id: s.id, position: s.position } } } }
        format.html { redirect_to leads_path, notice: "Stage order updated." }
      end
    else
      respond_to do |format|
        format.json { render json: { error: { message: friendly_failure(result) } }, status: :unprocessable_content }
        format.html { redirect_to leads_path, alert: friendly_failure(result) }
      end
    end
  end

  def destroy
    authorize @stage
    result = LeadStages::Destroy.call(stage: @stage, actor: Current.professional)
    if result.success?
      redirect_to leads_path, notice: "Stage deleted.", status: :see_other
    else
      redirect_to leads_path, alert: friendly_failure(result)
    end
  end

  private

  def load_stage
    @stage = policy_scope(LeadStage).find(params[:id])
  end

  def stage_params
    params.require(:lead_stage).permit(:name, :color, :is_won, :is_lost)
  end

  def broadcast_stage_upsert(_stage)
    # Stage list changes are rare and require a layout reflow of the board;
    # signal every open tab to refresh rather than shipping a minimal
    # Turbo::Stream patch. (The refresh uses the built-in Turbo 8 refresh
    # stream which re-fetches the index HTML.)
    Turbo::StreamsChannel.broadcast_refresh_to([ "organization", Current.organization.id, "leads" ])
  end

  def friendly_failure(result)
    result.message.presence || "Something went wrong."
  end

  def require_active_organization!
    return if Current.organization.present?
    redirect_to dashboard_path, alert: "Join or create an organization before managing stages."
  end
end
