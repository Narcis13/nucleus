module Leads
  class Destroy < ApplicationService
    def initialize(lead:, actor: nil)
      @lead = lead
      @actor = actor
    end

    def call
      @lead.destroy!
      success(lead: @lead)
    rescue ActiveRecord::RecordNotDestroyed => e
      failure(:invalid, message: e.message)
    end
  end
end
