module LeadStages
  class EnsureDefaults < ApplicationService
    # Seeds the New → Contacted → Qualified → Proposal → Won → Lost pipeline
    # the first time a professional opens the leads page. Idempotent: if any
    # stages already exist for the org, we return them untouched.
    #
    # Colors + won/lost flags mirror the core-pro seed so an org that
    # migrates across stacks sees an unchanged board.

    DEFAULT_STAGES = [
      { name: "New",       color: "#6366f1", is_won: false, is_lost: false, is_default: true },
      { name: "Contacted", color: "#0ea5e9", is_won: false, is_lost: false, is_default: false },
      { name: "Qualified", color: "#8b5cf6", is_won: false, is_lost: false, is_default: false },
      { name: "Proposal",  color: "#f59e0b", is_won: false, is_lost: false, is_default: false },
      { name: "Won",       color: "#22c55e", is_won: true,  is_lost: false, is_default: false },
      { name: "Lost",      color: "#ef4444", is_won: false, is_lost: true,  is_default: false }
    ].freeze

    def initialize(organization:)
      @organization = organization
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?

      existing = LeadStage.where(organization_id: @organization.id).ordered.to_a
      return success(stages: existing) if existing.any?

      stages = LeadStage.transaction do
        DEFAULT_STAGES.each_with_index.map do |attrs, idx|
          LeadStage.create!(attrs.merge(organization: @organization, position: idx))
        end
      end
      success(stages: stages)
    end
  end
end
