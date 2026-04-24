require "csv"

module Clients
  class Export < ApplicationService
    # Streaming CSV export. The controller sets response headers and calls
    # #each_row (or yields to #call_streaming) so large result sets don't
    # buffer the entire file in memory.

    HEADERS = %w[id full_name email phone status source created_at].freeze

    def initialize(scope:)
      @scope = scope
    end

    def call
      success(headers: HEADERS, rows: rows_enumerator)
    end

    def rows_enumerator
      scope = @scope
      Enumerator.new do |yielder|
        yielder << CSV.generate_line(HEADERS)
        scope.find_each(batch_size: 500) do |client|
          yielder << CSV.generate_line([
            client.id,
            client.full_name,
            client.email,
            client.phone,
            client.status,
            client.source,
            client.created_at&.iso8601
          ])
        end
      end
    end
  end
end
