class Client < ApplicationRecord
  include Auditable

  # Org-scoped CRM record. The tenant boundary is enforced at three layers:
  #   * acts_as_tenant :organization sets a default scope so forgotten
  #     .where(organization_id: ...) clauses still get pinned
  #   * Pundit's ClientPolicy::Scope re-asserts the same filter for belt-and-
  #     braces against a dev disabling acts_as_tenant in a console
  #   * Postgres RLS (Rs5 migration) is the final backstop — even a raw
  #     ActiveRecord::Base.connection.execute without acts_as_tenant can't
  #     see another tenant's rows under the authenticated role.

  STATUSES = %w[lead active archived].freeze

  acts_as_tenant :organization

  belongs_to :organization
  belongs_to :assigned_professional, class_name: "Professional", optional: true

  has_many :client_tags, dependent: :destroy
  has_many :tags, through: :client_tags

  validates :full_name, presence: true, length: { maximum: 160 }
  validates :email, length: { maximum: 255 }, allow_blank: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :phone, length: { maximum: 40 }, allow_blank: true
  validates :source, length: { maximum: 80 }, allow_blank: true
  validates :status, inclusion: { in: STATUSES }

  # Ransack whitelists: explicit opt-in is mandatory in Ransack 4+, and keeping
  # it minimal makes the search surface a deliberate choice. Adding a column
  # to this list is the gate for exposing it to query-string filtering — don't
  # widen without checking whether the column should ever be filterable.
  def self.ransackable_attributes(_auth_object = nil)
    %w[full_name email phone status source created_at updated_at]
  end

  def self.ransackable_associations(_auth_object = nil)
    %w[tags assigned_professional]
  end

  def to_s
    full_name.presence || email.presence || "Client #{id}"
  end
end
