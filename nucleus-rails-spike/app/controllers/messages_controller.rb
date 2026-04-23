class MessagesController < ApplicationController
  before_action :require_clerk_user!

  def create
    conversation = Conversation.find(params[:conversation_id])
    conversation.messages.create!(
      sender_clerk_id: current_clerk_user.id,
      body: message_params[:body]
    )

    # The append itself is broadcast by Message#after_create_commit to
    # every subscriber of the conversation stream (including this tab).
    # Here we only need to clear the sender's input by re-rendering an
    # empty form in their response.
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(
          "new_message_#{conversation.id}",
          partial: "messages/form",
          locals: { conversation: conversation, message: conversation.messages.new }
        )
      end
      format.html { redirect_to conversation_path(conversation) }
    end
  end

  private

  def message_params
    params.require(:message).permit(:body)
  end
end
