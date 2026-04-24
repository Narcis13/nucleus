class ClientsController < ApplicationController
  layout "dashboard"

  before_action :require_clerk_user!
  before_action :require_active_organization!
  before_action :load_client, only: %i[show edit update destroy]

  def index
    authorize Client
    base = policy_scope(Client).includes(:tags, :assigned_professional)
    @q = base.ransack(params[:q])
    @q.sorts = "created_at desc" if @q.sorts.empty?

    @pagy, @clients = pagy(@q.result)
    @tags = policy_scope(Tag).order(:name)
  end

  def show
    authorize @client
    @tags = policy_scope(Tag).order(:name)
    @tab = (params[:tab].presence || "overview").to_s

    # Lazy-loaded tab frames fire a follow-up GET with frame=1; render only
    # that tab's partial for those requests so the browser merges it into
    # the existing turbo-frame without a full page reload.
    if params[:frame] == "1"
      case @tab
      when "activity"
        @audit_logs = AuditLog
          .where(auditable_type: "Client", auditable_id: @client.id)
          .order(created_at: :desc).limit(50)
        render partial: "activity_tab", locals: { client: @client, audit_logs: @audit_logs }, layout: false
      when "notes"
        render partial: "notes_tab", locals: { client: @client }, layout: false
      when "documents"
        render partial: "documents_tab", locals: { client: @client }, layout: false
      when "messages"
        render partial: "messages_tab", locals: { client: @client }, layout: false
      else
        render partial: "overview", locals: { client: @client }, layout: false
      end
    end
  end

  def new
    authorize Client
    @client = Client.new
  end

  def edit
    authorize @client
  end

  def create
    authorize Client
    result = Clients::Create.call(
      attrs: client_params,
      actor: Current.professional,
      organization: Current.organization
    )

    if result.success?
      redirect_to client_path(result.client), notice: "Client created."
    else
      @client = Client.new(client_params)
      flash.now[:alert] = "Could not create client."
      render :new, status: :unprocessable_content
    end
  end

  def update
    authorize @client
    result = Clients::Update.call(client: @client, attrs: client_params, actor: Current.professional)

    if result.success?
      redirect_to client_path(result.client), notice: "Client updated."
    else
      flash.now[:alert] = "Could not update client."
      render :edit, status: :unprocessable_content
    end
  end

  def destroy
    authorize @client
    Clients::Destroy.call(client: @client, actor: Current.professional)
    redirect_to clients_path, notice: "Client deleted.", status: :see_other
  end

  private

  def load_client
    @client = policy_scope(Client).find(params[:id])
  end

  def client_params
    params.require(:client).permit(
      :full_name, :email, :phone, :status, :source, :notes, :assigned_professional_id
    )
  end

  def require_active_organization!
    return if Current.organization.present?
    redirect_to dashboard_path, alert: "Join or create an organization before managing clients."
  end
end
