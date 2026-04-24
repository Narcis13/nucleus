module LeadStages
  class Destroy < ApplicationService
    # Deletes a stage iff it's empty. The parent Lead belongs_to :stage with
    # onDelete: :restrict at the DB layer; we check in Ruby first so we can
    # return a friendly :conflict (not a raw FK violation).
    #
    # Also refuses to delete the last remaining stage for an org — the UI
    # requires at least one column.

    def initialize(stage:, actor:)
      @stage = stage
      @actor = actor
    end

    def call
      if Lead.where(stage_id: @stage.id).exists?
        return failure(:conflict, message: "Stage still has leads — move them first.")
      end
      if LeadStage.where(organization_id: @stage.organization_id).count <= 1
        return failure(:conflict, message: "Keep at least one stage.")
      end

      @stage.destroy!
      success(stage: @stage)
    rescue ActiveRecord::RecordNotDestroyed => e
      failure(:invalid, message: e.message)
    end
  end
end
