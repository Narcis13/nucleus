module LeadStages
  class Create < ApplicationService
    # Appends a new stage to the right of the current list. Position is
    # computed server-side (max + 1) so a racing client can't collide with
    # itself.

    def initialize(attrs:, actor:, organization:)
      @attrs = attrs.to_h.with_indifferent_access
      @actor = actor
      @organization = organization
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?

      next_position = (LeadStage.where(organization_id: @organization.id).maximum(:position) || -1) + 1
      stage = LeadStage.new(
        organization: @organization,
        name: @attrs[:name],
        color: @attrs[:color].presence || LeadStage::DEFAULT_COLOR,
        position: next_position,
        is_won: ActiveModel::Type::Boolean.new.cast(@attrs[:is_won]) || false,
        is_lost: ActiveModel::Type::Boolean.new.cast(@attrs[:is_lost]) || false
      )
      return failure(:invalid, errors: stage.errors, stage: stage) unless stage.save

      success(stage: stage)
    end
  end
end
