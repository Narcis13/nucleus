module Leads
  class Create < ApplicationService
    # Single write path for HTML + JSON + (eventually) MCP. Lands in a given
    # stage (from params) or falls back to the first stage for the org so
    # the HTML quick-add can skip the stage_id when it already knows which
    # column was clicked.

    PERMITTED = %i[full_name email phone source score notes].freeze

    def initialize(attrs:, actor:, organization:, stage_id: nil)
      @attrs = attrs.to_h.with_indifferent_access
      @actor = actor
      @organization = organization
      @stage_id = (stage_id || @attrs[:stage_id]).presence
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?

      stage = resolve_stage
      return failure(:invalid, message: "No pipeline stages available. Open the leads board once to seed defaults.") if stage.nil?

      lead = Lead.new(@attrs.slice(*PERMITTED))
      lead.organization = @organization
      lead.stage = stage
      lead.email = lead.email.presence
      lead.phone = lead.phone.presence
      lead.source = lead.source.presence

      Lead.transaction do
        return failure(:invalid, errors: lead.errors, lead: lead) unless lead.save
        lead.activities.create!(activity_type: "created", description: "Lead created")
      end

      success(lead: lead)
    end

    private

    def resolve_stage
      if @stage_id
        LeadStage.where(organization_id: @organization.id).find_by(id: @stage_id)
      else
        LeadStage.where(organization_id: @organization.id).ordered.first
      end
    end
  end
end
