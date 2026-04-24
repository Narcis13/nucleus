class Organization < ApplicationRecord
  include Auditable

  has_many :organization_memberships, dependent: :destroy
  has_many :professionals, through: :organization_memberships

  validates :clerk_org_id, presence: true, uniqueness: true

  # Upserts from a Clerk organization payload (webhook or SDK). Duck-typed
  # input: responds to :id, :name, :slug (slug may be absent on older Clerk
  # instances — tolerate nil). Clerk is the source of truth for identity;
  # our local row is just a projection we can FK against.
  def self.upsert_from_clerk!(data)
    clerk_org_id = data[:id] || data["id"]
    raise ArgumentError, "clerk org id required" if clerk_org_id.blank?

    find_or_initialize_by(clerk_org_id: clerk_org_id).tap do |org|
      org.name = data[:name] || data["name"]
      org.slug = data[:slug] || data["slug"]
      org.save!
    end
  end
end
