class Message < ApplicationRecord
  acts_as_tenant :professional

  belongs_to :conversation
  belongs_to :professional

  validates :body, presence: true
  validates :sender_clerk_id, presence: true

  before_validation :inherit_tenant_from_conversation, on: :create

  # Hotwire broadcast: appends the rendered _message partial to the
  # "messages" target inside every client subscribed to the conversation
  # stream (see turbo_stream_from in conversations/show).
  after_create_commit -> { broadcast_append_to conversation, target: "messages" }

  private

  def inherit_tenant_from_conversation
    self.professional_id ||= conversation&.professional_id
  end
end
