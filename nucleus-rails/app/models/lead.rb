class Lead < ApplicationRecord
  include Auditable

  # Pipeline card. Belongs to exactly one stage at a time; moving between
  # stages is a standalone service (Leads::Move) that appends a
  # `stage_changed` LeadActivity so the timeline stays authoritative without
  # a separate audit table.

  acts_as_tenant :organization

  belongs_to :organization
  belongs_to :stage, class_name: "LeadStage", inverse_of: :leads
  belongs_to :converted_client, class_name: "Client", optional: true

  has_many :activities, -> { order(created_at: :desc) },
           class_name: "LeadActivity", dependent: :destroy, inverse_of: :lead

  validates :full_name, presence: true, length: { maximum: 200 }
  validates :email, length: { maximum: 255 }, allow_blank: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :phone, length: { maximum: 40 }, allow_blank: true
  validates :source, length: { maximum: 80 }, allow_blank: true
  validates :score, numericality: { only_integer: true, in: 0..100 }
  validates :notes, length: { maximum: 4000 }, allow_blank: true

  # Cross-tenant safety: even with acts_as_tenant + RLS, a malformed payload
  # could aim a lead at a stage in another org. Enforce it at the model
  # layer so the service returns a clean validation error, not a DB error.
  validate :stage_belongs_to_same_organization

  scope :active, -> { where(converted_client_id: nil) }

  def self.ransackable_attributes(_auth_object = nil)
    %w[full_name email phone source score stage_id created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[stage]
  end

  def converted?
    converted_client_id.present?
  end

  private

  def stage_belongs_to_same_organization
    return if stage.nil? || organization_id.nil?
    return if stage.organization_id == organization_id
    errors.add(:stage, "must belong to the same organization")
  end
end
