class Tag < ApplicationRecord
  include Auditable

  # Tags are org-scoped labels; a single professional can't have private tags
  # because the whole team uses them to filter the shared client list. The
  # name is case-insensitively unique per org (enforced by a functional index
  # in the Rs5 migration) and the color is a hex triple used by the UI badge.

  HEX_COLOR = /\A#[0-9a-fA-F]{6}\z/
  DEFAULT_COLOR = "#6b7280".freeze

  acts_as_tenant :organization

  belongs_to :organization
  has_many :client_tags, dependent: :destroy
  has_many :clients, through: :client_tags

  validates :name, presence: true, length: { maximum: 40 }
  validates :color, presence: true, format: { with: HEX_COLOR }
  validates :name, uniqueness: { scope: :organization_id, case_sensitive: false }

  def self.ransackable_attributes(_auth_object = nil)
    %w[name created_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[clients]
  end
end
