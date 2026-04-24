module Clients
  class Create < ApplicationService
    # Single write path for HTML + JSON + (eventually) MCP. Uses the caller's
    # Current.organization so the model's acts_as_tenant + RLS both agree on
    # ownership; the controller never passes organization_id directly.

    def initialize(attrs:, actor:, organization:)
      @attrs = attrs.to_h
      @actor = actor
      @organization = organization
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?

      client = Client.new(@attrs)
      client.organization = @organization

      return failure(:invalid, errors: client.errors, client: client) unless client.save

      success(client: client)
    end
  end
end
