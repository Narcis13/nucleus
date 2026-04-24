class LeadActivity < ApplicationRecord
  # Append-only event row: one per note, call, email, meeting, stage_changed,
  # converted, created, lost. No updated_at (we never edit an activity — if
  # you need to "fix" one, append a corrective row).
  #
  # Isolation is inherited from the parent Lead's RLS policy, so there's no
  # organization_id column here — same shape as ClientTag in Rs5. Keep
  # acts_as_tenant off this model for that reason.

  # The DB column is `activity_type` (not `type`) so ActiveRecord's STI
  # inheritance column is irrelevant here — but keep the list of known
  # types centralized so services don't freelance.
  TYPES = %w[created note call email meeting stage_changed converted lost form_filled].freeze

  belongs_to :lead

  validates :activity_type, presence: true, length: { maximum: 40 }
  validates :description, length: { maximum: 2000 }, allow_blank: true

  scope :recent, -> { order(created_at: :desc) }
end
