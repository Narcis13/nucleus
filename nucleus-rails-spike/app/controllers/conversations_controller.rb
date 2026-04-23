class ConversationsController < ApplicationController
  before_action :require_clerk_user!

  def index
    @conversations = Conversation.includes(:client).order(updated_at: :desc)
  end

  def show
    @conversation = Conversation.find(params[:id])
    @messages = @conversation.messages
    @message  = @conversation.messages.new
  end

  def create
    @conversation = Conversation.find_or_create_by!(
      client_id: params.require(:client_id)
    ) do |c|
      c.professional = current_professional
    end
    redirect_to conversation_path(@conversation)
  end
end
