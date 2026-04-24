module LeadStages
  class Update < ApplicationService
    PERMITTED = %i[name color is_won is_lost].freeze

    def initialize(stage:, attrs:, actor:)
      @stage = stage
      @attrs = attrs.to_h.with_indifferent_access.slice(*PERMITTED)
      @actor = actor
    end

    def call
      return failure(:invalid, errors: @stage.errors, stage: @stage) unless @stage.update(@attrs)
      success(stage: @stage)
    end
  end
end
