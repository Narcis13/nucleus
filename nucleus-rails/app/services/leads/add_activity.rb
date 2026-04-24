module Leads
  class AddActivity < ApplicationService
    # Manual activity entry from the detail panel (note / call / email /
    # meeting). Automatic activity rows (created, stage_changed, converted,
    # lost) are appended by their own service objects — call this only for
    # user-authored entries.

    MANUAL_TYPES = %w[note call email meeting].freeze

    def initialize(lead:, activity_type:, description:, actor: nil)
      @lead = lead
      @activity_type = activity_type.to_s
      @description = description.to_s
      @actor = actor
    end

    def call
      unless MANUAL_TYPES.include?(@activity_type)
        return failure(:invalid, message: "activity_type must be one of: #{MANUAL_TYPES.join(", ")}")
      end
      if @description.strip.empty?
        return failure(:invalid, message: "description required")
      end

      activity = @lead.activities.create(activity_type: @activity_type, description: @description.strip)
      return failure(:invalid, errors: activity.errors, activity: activity) unless activity.persisted?

      success(activity: activity)
    end
  end
end
