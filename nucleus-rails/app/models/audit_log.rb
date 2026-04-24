class AuditLog < ApplicationRecord
  # Append-only. Rows are written by Auditable via model callbacks; there is
  # no UI path to mutate them. Reads are org-scoped at the DB layer via RLS,
  # so even a buggy controller can't surface another tenant's trail.

  belongs_to :organization
  belongs_to :actor, class_name: "Professional", optional: true

  validates :action, presence: true
  validates :auditable_type, presence: true
  validates :auditable_id, presence: true

  # Block any post-insert mutation. The DB row is the legal record.
  def readonly?
    persisted?
  end
end
