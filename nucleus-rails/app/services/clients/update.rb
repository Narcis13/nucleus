module Clients
  class Update < ApplicationService
    def initialize(client:, attrs:, actor:)
      @client = client
      @attrs = attrs.to_h
      @actor = actor
    end

    def call
      return failure(:invalid, errors: @client.errors) unless @client.update(@attrs)
      success(client: @client)
    end
  end
end
