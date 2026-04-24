class LeadsController < ApplicationController
  layout "dashboard"

  before_action :require_clerk_user!
  before_action :require_active_organization!
  before_action :load_lead, only: %i[show update destroy]

  def index
    authorize Lead

    # First-visit seed: idempotent, returns existing stages when any.
    LeadStages::EnsureDefaults.call(organization: Current.organization)

    @stages = policy_scope(LeadStage).ordered.to_a
    @leads = policy_scope(Lead).active.includes(:stage).order(created_at: :desc).to_a
    @activities_by_lead = LeadActivity
      .where(lead_id: @leads.map(&:id))
      .recent
      .group_by(&:lead_id)
    @open_lead_id = params[:lead_id].presence
    @open_lead = @leads.find { |l| l.id == @open_lead_id } if @open_lead_id
  end

  def show
    authorize @lead
    # Fetched as a turbo-frame navigation from a card click; render the
    # layout-less detail view so Turbo swaps the frame contents in place.
    # A direct GET (no frame) falls back to the index with ?lead_id=… so
    # refreshing the URL still works.
    @stages = policy_scope(LeadStage).ordered.to_a
    @activities = @lead.activities.recent.to_a
    if turbo_frame_request?
      render :show, layout: false
    else
      redirect_to leads_path(lead_id: @lead.id)
    end
  end

  def create
    authorize Lead
    result = Leads::Create.call(
      attrs: lead_params.except(:stage_id).to_h,
      stage_id: lead_params[:stage_id],
      actor: Current.professional,
      organization: Current.organization
    )

    if result.success?
      respond_to do |format|
        format.html { redirect_to leads_path, notice: "Lead added." }
        format.turbo_stream do
          # Broadcast handles both the acting tab's prepend AND every
          # passive tab's — same DOM shape regardless of where the write
          # originated.
          broadcast_lead_append(result.lead)
          head :no_content
        end
      end
    else
      respond_to do |format|
        format.html { redirect_to leads_path, alert: friendly_failure(result) }
        format.turbo_stream { render_failure(result) }
      end
    end
  end

  def update
    authorize @lead
    result = Leads::Update.call(lead: @lead, attrs: lead_params.to_h, actor: Current.professional)

    if result.success?
      respond_to do |format|
        format.html { redirect_to leads_path(lead_id: @lead.id), notice: "Lead updated." }
        format.turbo_stream do
          broadcast_lead_upsert(result.lead)
          head :no_content
        end
      end
    else
      respond_to do |format|
        format.html { redirect_to leads_path(lead_id: @lead.id), alert: "Could not update lead." }
        format.turbo_stream { render_failure(result) }
      end
    end
  end

  def move
    @lead = policy_scope(Lead).find(params[:id])
    authorize @lead, :move?
    move_and_respond(@lead, params[:stage_id])
  end

  def convert
    @lead = policy_scope(Lead).find(params[:id])
    authorize @lead, :convert?
    result = Leads::Convert.call(
      lead: @lead,
      actor: Current.professional,
      organization: Current.organization
    )
    if result.success?
      respond_to do |format|
        format.html { redirect_to client_path(result.client_id), notice: "Lead converted to client." }
        format.turbo_stream do
          # Converted leads are filtered out by Lead.active scope; remove
          # the card from every tab instead of just updating it.
          Turbo::StreamsChannel.broadcast_remove_to(leads_stream_name, target: dom_id(result.lead))
          head :no_content
        end
      end
    else
      respond_to do |format|
        format.html { redirect_to leads_path(lead_id: @lead.id), alert: friendly_failure(result) }
        format.turbo_stream { render_failure(result) }
      end
    end
  end

  def mark_lost
    @lead = policy_scope(Lead).find(params[:id])
    authorize @lead, :mark_lost?
    result = Leads::MarkLost.call(lead: @lead, reason: params[:reason], actor: Current.professional)
    if result.success?
      respond_to do |format|
        format.html { redirect_to leads_path(lead_id: @lead.id), notice: "Marked as lost." }
        format.turbo_stream do
          broadcast_lead_move(result.lead)
          head :no_content
        end
      end
    else
      respond_to do |format|
        format.html { redirect_to leads_path(lead_id: @lead.id), alert: friendly_failure(result) }
        format.turbo_stream { render_failure(result) }
      end
    end
  end

  def destroy
    authorize @lead
    Leads::Destroy.call(lead: @lead, actor: Current.professional)
    respond_to do |format|
      format.html { redirect_to leads_path, notice: "Lead deleted.", status: :see_other }
      format.turbo_stream do
        Turbo::StreamsChannel.broadcast_remove_to(leads_stream_name, target: dom_id(@lead))
        render turbo_stream: turbo_stream.remove(dom_id(@lead))
      end
    end
  end

  private

  def load_lead
    @lead = policy_scope(Lead).find(params[:id])
  end

  def lead_params
    params.require(:lead).permit(:full_name, :email, :phone, :source, :score, :notes, :stage_id)
  end

  def move_and_respond(lead, stage_id)
    result = Leads::Move.call(lead: lead, stage_id: stage_id, actor: Current.professional)
    if result.success?
      respond_to do |format|
        format.html { redirect_to leads_path(lead_id: lead.id), notice: "Lead moved." }
        format.turbo_stream do
          # Every subscriber (including the acting tab) receives the
          # remove+append broadcast. The acting tab's Sortable already
          # placed the node optimistically; the broadcast re-applies the
          # canonical placement so a failed server write can't leave two
          # browsers in different states. Flicker is <16ms and the drop
          # feels instant.
          broadcast_lead_move(result.lead)
          head :no_content
        end
        format.json { render json: { id: result.lead.id, stage_id: result.lead.stage_id } }
      end
    else
      respond_to do |format|
        format.html { redirect_to leads_path(lead_id: lead.id), alert: friendly_failure(result) }
        format.turbo_stream { render_failure(result) }
        format.json { render json: { error: { message: friendly_failure(result) } }, status: :unprocessable_content }
      end
    end
  end

  # Broadcasts the updated card to every tab subscribed to the per-org
  # leads stream. Verification target for Rs6: "Open the same Kanban in two
  # tabs; drag in tab A, tab B updates within 200ms." The broadcast renders
  # the same partial we serve inline so both tabs converge on one markup.
  def broadcast_lead_upsert(lead)
    Turbo::StreamsChannel.broadcast_replace_to(
      leads_stream_name,
      target: dom_id(lead),
      partial: "leads/card",
      locals: { lead: lead, stage: lead.stage }
    )
  end

  # Physical move broadcast: remove the card wherever it lives, then append
  # it to the new column. Acting tab skips this path — Sortable already
  # moved the DOM — but passive tabs need it to reflect the drag.
  def broadcast_lead_move(lead)
    Turbo::StreamsChannel.broadcast_remove_to(leads_stream_name, target: dom_id(lead))
    Turbo::StreamsChannel.broadcast_append_to(
      leads_stream_name,
      target: column_dom_id(lead.stage_id),
      partial: "leads/card",
      locals: { lead: lead, stage: lead.stage }
    )
  end

  # New-lead append: the card doesn't exist yet, so we target the column's
  # <ul> (identified by its stage_id) and prepend. Broadcast + local stream
  # use the same target id so both the authoring browser and every other
  # tab receive the identical prepend.
  def broadcast_lead_append(lead)
    Turbo::StreamsChannel.broadcast_prepend_to(
      leads_stream_name,
      target: column_dom_id(lead.stage_id),
      partial: "leads/card",
      locals: { lead: lead, stage: lead.stage }
    )
  end

  def column_dom_id(stage_id)
    "lead_stage_#{stage_id}_leads"
  end

  def render_failure(result)
    # Shallow inline flash. Browsers without turbo accept text/plain for
    # fetch failures too, which keeps Sortable.js's onEnd handler simple.
    render turbo_stream: turbo_stream.append(
      "toasts",
      partial: "shared/toast",
      locals: { message: friendly_failure(result), kind: "alert" }
    ), status: :unprocessable_content
  rescue ActionView::MissingTemplate
    render plain: friendly_failure(result), status: :unprocessable_content
  end

  def friendly_failure(result)
    result.message.presence || "Something went wrong."
  end

  def leads_stream_name
    [ "organization", Current.organization.id, "leads" ]
  end

  def dom_id(record)
    ActionView::RecordIdentifier.dom_id(record)
  end

  def require_active_organization!
    return if Current.organization.present?
    redirect_to dashboard_path, alert: "Join or create an organization before managing leads."
  end
end
