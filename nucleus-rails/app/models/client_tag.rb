class ClientTag < ApplicationRecord
  # Pure join row: client <-> tag. Isolation is delegated to the parent row's
  # RLS policy (see Rs5 migration) so there's no organization_id column of
  # its own and nothing to keep in sync.

  belongs_to :client
  belongs_to :tag

  validates :client_id, uniqueness: { scope: :tag_id }
  validate :client_and_tag_same_organization

  private

  def client_and_tag_same_organization
    return if client.nil? || tag.nil?
    return if client.organization_id == tag.organization_id
    errors.add(:base, "client and tag must belong to the same organization")
  end
end
