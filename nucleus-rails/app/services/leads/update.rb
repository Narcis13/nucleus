module Leads
  class Update < ApplicationService
    PERMITTED = %i[full_name email phone source score notes].freeze

    def initialize(lead:, attrs:, actor:)
      @lead = lead
      @attrs = attrs.to_h.with_indifferent_access.slice(*PERMITTED)
      @actor = actor
      # Convert empty strings on nullable columns back to nil so the DB
      # sees them as cleared, not as literal "".
      %i[email phone source notes].each do |k|
        @attrs[k] = nil if @attrs.key?(k) && @attrs[k] == ""
      end
    end

    def call
      return failure(:invalid, errors: @lead.errors, lead: @lead) unless @lead.update(@attrs)
      success(lead: @lead)
    end
  end
end
