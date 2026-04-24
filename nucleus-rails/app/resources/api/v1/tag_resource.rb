module Api
  module V1
    class TagResource < ApplicationResource
      attributes :id, :name, :color, :organization_id

      attribute :created_at do |tag|
        tag.created_at&.iso8601
      end
    end
  end
end
