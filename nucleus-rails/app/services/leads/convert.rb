module Leads
  class Convert < ApplicationService
    # Converts a lead into a paying client. Creates the Client row in the
    # same org, sets lead.converted_client_id, moves the lead onto the
    # first "won" stage (if one exists) and appends a `converted` activity.
    # All inside one transaction so a failure leaves nothing half-written.
    #
    # Requires the lead to have an email — the Client model requires one
    # for login-able accounts down the line (Rs7 portal). Refuse early with
    # a clear error rather than failing validation on save.

    def initialize(lead:, actor:, organization:)
      @lead = lead
      @actor = actor
      @organization = organization
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?
      return success(lead: @lead, client_id: @lead.converted_client_id) if @lead.converted?
      if @lead.email.blank?
        return failure(:invalid, message: "Lead is missing an email — required to create a client.")
      end

      client = nil
      Lead.transaction do
        client = Client.create!(
          organization: @organization,
          full_name: @lead.full_name,
          email: @lead.email,
          phone: @lead.phone,
          source: @lead.source.presence || "lead",
          status: "active"
        )

        won_stage = LeadStage.where(organization_id: @organization.id, is_won: true).ordered.first
        @lead.update!(
          converted_client_id: client.id,
          stage: won_stage || @lead.stage
        )
        @lead.activities.create!(
          activity_type: "converted",
          description: "Converted to client",
          metadata: { client_id: client.id }
        )
      end

      success(lead: @lead, client: client, client_id: client.id)
    end
  end
end
