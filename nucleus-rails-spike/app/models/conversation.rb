class Conversation < ApplicationRecord
  acts_as_tenant :professional

  belongs_to :professional
  belongs_to :client
  has_many :messages, -> { order(created_at: :asc) }, dependent: :destroy

  validates :client_id, uniqueness: { scope: :professional_id }
end
