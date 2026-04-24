class LeadStage < ApplicationRecord
  include Auditable

  # One Kanban column per row. `position` orders columns left-to-right;
  # `is_won` / `is_lost` flag the terminal columns so Leads::Convert and
  # Leads::MarkLost don't have to string-match on name.
  #
  # Tenancy: organization-scoped under the Rs3 pattern (acts_as_tenant +
  # Pundit scope + RLS). The default seed (Leads::EnsureDefaults) creates
  # the New → Won/Lost sequence on first load.

  HEX_COLOR = /\A#[0-9a-fA-F]{6}\z/
  DEFAULT_COLOR = "#6366f1".freeze

  acts_as_tenant :organization

  belongs_to :organization
  has_many :leads, foreign_key: :stage_id, dependent: :restrict_with_error, inverse_of: :stage

  validates :name, presence: true, length: { maximum: 60 }
  validates :position, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :color, presence: true, format: { with: HEX_COLOR }

  scope :ordered, -> { order(:position, :created_at) }

  # Mutual exclusion: a stage can't be simultaneously "won" and "lost".
  validate :won_and_lost_are_exclusive

  def self.ransackable_attributes(_auth_object = nil)
    %w[name position is_won is_lost created_at]
  end

  private

  def won_and_lost_are_exclusive
    return unless is_won && is_lost
    errors.add(:base, "a stage cannot be both won and lost")
  end
end
