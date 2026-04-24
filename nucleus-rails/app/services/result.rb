class Result
  # Service-object return value. Always answers #success? or #failure? and
  # never both; carries a payload hash on success and an error code (with
  # optional details) on failure.
  #
  # The payload is exposed via bracket access AND method_missing-style
  # readers so callers can write either `result[:client]` or
  # `result.client` — whichever reads cleaner at the call site.

  attr_reader :data, :code, :errors, :message

  def self.success(payload = {})
    new(success: true, data: payload)
  end

  def self.failure(code:, errors: nil, message: nil, data: {})
    new(success: false, code: code, errors: errors, message: message, data: data)
  end

  def initialize(success:, data: {}, code: nil, errors: nil, message: nil)
    @success = success
    @data = data || {}
    @code = code
    @errors = errors
    @message = message
  end

  def success? = @success
  def failure? = !@success

  def [](key)
    @data[key]
  end

  def respond_to_missing?(name, include_private = false)
    @data.key?(name) || super
  end

  def method_missing(name, *args, &block)
    return @data[name] if @data.key?(name) && args.empty? && block.nil?
    super
  end
end
