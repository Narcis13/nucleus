module Api
  module V1
    class ClientResource < ApplicationResource
      # Canonical shape for /api/v1/clients. Shallow by default so list
      # responses stay compact; tags are embedded because the list view's
      # primary pivot is tag filtering, and the cost of including them is
      # one extra small object per row.

      attributes :id, :full_name, :email, :phone, :status, :source, :notes,
                 :assigned_professional_id, :organization_id

      attribute :created_at do |client|
        client.created_at&.iso8601
      end

      attribute :updated_at do |client|
        client.updated_at&.iso8601
      end

      attribute :tags do |client|
        client.tags.map { |t| { id: t.id, name: t.name, color: t.color } }
      end
    end
  end
end
