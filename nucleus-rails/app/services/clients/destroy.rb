module Clients
  class Destroy < ApplicationService
    def initialize(client:, actor:)
      @client = client
      @actor = actor
    end

    def call
      @client.destroy!
      success(client: @client)
    rescue ActiveRecord::RecordNotDestroyed => e
      failure(:invalid, message: e.message)
    end
  end
end
