class ClientsController < ApplicationController
  before_action :require_clerk_user!
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

  def set_client
    @client = Client.find(params[:id])
  end

  def client_params
    params.require(:client).permit(:full_name, :email, :phone)
  end
end
