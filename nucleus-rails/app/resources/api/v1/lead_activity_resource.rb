module Api
  module V1
    class LeadActivityResource < ApplicationResource
      # Append-only log row. `type` is the spec field name; the DB column is
      # `activity_type` (to dodge Rails' STI inheritance column) and we
      # expose it under its external name here.

      attributes :id, :lead_id, :description, :metadata

      attribute :type do |activity|
        activity.activity_type
      end

      attribute :created_at do |activity|
        activity.created_at&.iso8601
      end
    end
  end
end
