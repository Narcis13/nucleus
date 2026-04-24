module Api
  module ErrorHandling
    # One envelope for every non-2xx response on /api/v1:
    #
    #   { "error": { "code": "<snake_case>", "message": "...", "details": {...} } }
    #
    # 4xx includes "code" + "message" (+ optional "details" hash for
    # validation errors). 5xx collapses to just a request_id to avoid
    # leaking stack traces. Keep the shape stable: OpenAPI (Rs26.5) will
    # generate against it.
    extend ActiveSupport::Concern

    # Service-object failure codes → HTTP status. Subclasses can extend by
    # merging into the constant; keep the default map minimal.
    FAILURE_STATUS = {
      invalid: :unprocessable_content,
      not_found: :not_found,
      forbidden: :forbidden,
      unauthenticated: :unauthorized,
      conflict: :conflict,
      rate_limited: :too_many_requests
    }.freeze

    included do
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from ActionController::ParameterMissing, with: :render_parameter_missing
      rescue_from Pundit::NotAuthorizedError, with: :render_forbidden if defined?(Pundit)
    end

    def render_api_error(code:, status:, message:, details: nil)
      payload = { error: { code: code.to_s, message: message } }
      payload[:error][:details] = details if details.present?
      render json: payload, status: status
    end

    # Translates a service-object Result failure into a JSON envelope.
    # The code → status map is stable so OpenAPI descriptions don't drift.
    def render_result_failure(result)
      status = FAILURE_STATUS[result.code] || :unprocessable_content
      details = normalize_errors(result.errors)
      render_api_error(
        code: result.code,
        status: status,
        message: result.message || default_message_for(result.code),
        details: details
      )
    end

    private

    def render_not_found(_e = nil)
      render_api_error(code: :not_found, status: :not_found, message: "Not found")
    end

    def render_parameter_missing(e)
      render_api_error(code: :invalid, status: :unprocessable_content,
                       message: "Missing parameter: #{e.param}")
    end

    def render_forbidden(_e = nil)
      render_api_error(code: :forbidden, status: :forbidden, message: "Not authorized")
    end

    def normalize_errors(errors)
      case errors
      when nil then nil
      when ActiveModel::Errors then errors.as_json
      when Hash then errors
      when String, Symbol then { base: [ errors.to_s ] }
      when Array then { base: errors.map(&:to_s) }
      else errors.to_s
      end
    end

    def default_message_for(code)
      case code
      when :invalid then "Validation failed"
      when :not_found then "Not found"
      when :forbidden then "Not authorized"
      when :unauthenticated then "Not authenticated"
      when :conflict then "Conflict"
      when :rate_limited then "Rate limit exceeded"
      else "Request failed"
      end
    end
  end
end
