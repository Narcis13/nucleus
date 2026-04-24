class LeadActivitiesController < ApplicationController
  layout "dashboard"

  before_action :require_clerk_user!
  before_action :require_active_organization!
  before_action :load_lead

  def create
    authorize @lead, :add_activity?
    result = Leads::AddActivity.call(
      lead: @lead,
      activity_type: params[:activity_type],
      description: params[:description],
      actor: Current.professional
    )
    if result.success?
      broadcast_activity_append(result.activity)
      respond_to do |format|
        # Broadcast handles the DOM update for every subscriber (including
        # the acting tab). HTML fallback redirects so a browser without
        # Turbo still sees the new row after a reload.
        format.turbo_stream { head :no_content }
        format.html { redirect_to leads_path(lead_id: @lead.id) }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.append(
            "toasts", partial: "shared/toast",
            locals: { message: result.message || "Couldn't log activity.", kind: "alert" }
          ), status: :unprocessable_content
        end
        format.html { redirect_to leads_path(lead_id: @lead.id), alert: result.message || "Couldn't log activity." }
      end
    end
  end

  private

  def load_lead
    @lead = policy_scope(Lead).find(params[:lead_id])
  end

  def broadcast_activity_append(activity)
    Turbo::StreamsChannel.broadcast_prepend_to(
      [ "organization", Current.organization.id, "leads", "activity", @lead.id ],
      target: "lead_activity_list",
      partial: "lead_activities/activity",
      locals: { activity: activity }
    )
  end

  def require_active_organization!
    return if Current.organization.present?
    redirect_to dashboard_path, alert: "Join or create an organization before logging activities."
  end
end
