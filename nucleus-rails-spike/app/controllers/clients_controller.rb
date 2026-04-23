class ClientsController < ApplicationController
  before_action :require_clerk_user!
  before_action :enforce_client_quota!, only: [:new, :create]
  before_action :set_client, only: :show

  def index
    @clients = Client.order(created_at: :desc)
  end

  def new
    @client = Client.new
  end

  def create
    @client = Client.new(client_params)
    if @client.save
      redirect_to clients_path, notice: "Client created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
  end

  private

  def enforce_client_quota!
    return if current_professional.subscribed_and_within_quota?(:max_clients)
    if current_professional.payment_processor&.subscription&.active?
      limit = Plans.limit_for(current_professional.current_plan, :max_clients)
      redirect_to billing_upgrade_path,
                  alert: "You've reached the #{limit}-client limit on #{Plans.label_for(current_professional.current_plan)}. Upgrade to add more."
    else
      redirect_to billing_upgrade_path,
                  alert: "An active subscription is required to add clients."
    end
  end

  def set_client
    @client = Client.find(params[:id])
  end

  def client_params
    params.require(:client).permit(:full_name, :email, :phone)
  end
end
