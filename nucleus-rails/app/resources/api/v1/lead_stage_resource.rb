module Api
  module V1
    class LeadStageResource < ApplicationResource
      # Stage columns of the Kanban — used in both the stages index and
      # nested alongside leads in the pipeline response.

      attributes :id, :name, :color, :position, :is_default, :is_won, :is_lost,
                 :organization_id

      attribute :created_at do |stage|
        stage.created_at&.iso8601
      end
    end
  end
end
