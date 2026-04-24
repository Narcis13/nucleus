class ApplicationService
  # Every write in nucleus goes through a subclass of this. The HTML
  # controller and the API controller both call `Thing::Do.call(...)` and
  # translate the returned Result into either a flash/redirect or a JSON
  # envelope. No business logic in either controller.
  #
  # Subclass shape:
  #
  #   class Clients::Create < ApplicationService
  #     def initialize(attrs:, actor:)
  #       @attrs = attrs
  #       @actor = actor
  #     end
  #
  #     def call
  #       client = Client.new(@attrs)
  #       return failure(:invalid, errors: client.errors) unless client.save
  #       success(client: client)
  #     end
  #   end
  #
  # `call` is invoked via the class helper below so callers write
  # `Clients::Create.call(attrs: ..., actor: ...)` — keeps instantiation
  # in one place and gives a single call-site to add metrics/tracing later.

  def self.call(**kwargs)
    new(**kwargs).call
  end

  private

  def success(**payload)
    Result.success(payload)
  end

  # `code` is a short machine-readable symbol (e.g. :invalid, :not_found,
  # :forbidden, :conflict) that Api::V1::BaseController maps to an HTTP
  # status. `errors` may be an ActiveModel::Errors, a hash, or a string —
  # the API base renders a consistent shape regardless.
  def failure(code, errors: nil, message: nil)
    Result.failure(code: code, errors: errors, message: message)
  end
end
