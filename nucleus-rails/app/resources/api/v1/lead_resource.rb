module Api
  module V1
    class LeadResource < ApplicationResource
      # Shallow by default: the list view's primary pivot is `stage_id`, so
      # we flatten it onto the row rather than nesting the whole stage. The
      # timeline is fetched separately (GET /api/v1/leads/:id/activities) so
      # the list response stays compact.

      attributes :id, :full_name, :email, :phone, :source, :score, :notes,
                 :stage_id, :organization_id, :converted_client_id

      attribute :created_at do |lead|
        lead.created_at&.iso8601
      end

      attribute :updated_at do |lead|
        lead.updated_at&.iso8601
      end
    end
  end
end
