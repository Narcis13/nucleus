# Rate limits for /api/v1 and (low-rent) health-style paths.
#
# - Authenticated API calls bucket by PAT id (600 req/min/token).
# - Unauthenticated /api/v1 hits bucket by client IP (50 req/min/IP).
#
# Dashboard / Hotwire traffic isn't rate-limited here — keep this file
# scoped to the public API so dev browsers never get 429'd while you're
# testing. If we add per-user dashboard limits, do it in a separate
# initializer.
#
# The cache store: Rails.cache is Solid Cache in this app (Rails 8 default),
# so rules survive restarts and share state across Puma workers without
# needing Redis.

class Rack::Attack
  API_V1_PATH = /\A\/api\/v1/.freeze
  PAT_HEADER  = /\ABearer\s+nuc_pat_([0-9a-f]{32})\.[^\s.]+\z/i.freeze

  Rack::Attack.cache.store = Rails.cache

  # Per-token rate limit. The token-id prefix is enough to key the bucket
  # uniquely without needing the DB. If the header is absent or malformed
  # the discriminator returns nil and this throttle is skipped (the
  # unauthenticated-IP throttle picks it up instead).
  throttle("api/v1/pat", limit: 600, period: 60) do |req|
    next unless req.path.match?(API_V1_PATH)
    auth = req.get_header("HTTP_AUTHORIZATION")
    m = auth.to_s.match(PAT_HEADER)
    next unless m
    "pat:#{m[1]}"
  end

  # Unauthenticated bucket: missing / malformed Authorization header on an
  # API path. 50/min/IP is intentionally low — no legitimate client should
  # need to bang on /api/v1 without a token.
  throttle("api/v1/unauth", limit: 50, period: 60) do |req|
    next unless req.path.match?(API_V1_PATH)
    auth = req.get_header("HTTP_AUTHORIZATION")
    next if auth.to_s.match?(PAT_HEADER)
    "unauth:#{req.ip}"
  end

  # Rack::Attack's default 429 body is a plain-text string. Override with
  # the same JSON envelope /api/v1 returns for every other error so clients
  # have one shape to parse. Retry-After counts seconds until the bucket
  # resets.
  self.throttled_responder = lambda do |request|
    match_data = request.env["rack.attack.match_data"] || {}
    period = (match_data[:period] || 60).to_i
    now = Time.now.to_i
    retry_after = period - (now % period)
    retry_after = period if retry_after <= 0

    body = {
      error: {
        code: "rate_limited",
        message: "Rate limit exceeded. Retry later."
      }
    }.to_json

    [ 429,
      {
        "Content-Type"   => "application/json; charset=utf-8",
        "Retry-After"    => retry_after.to_s,
        "Content-Length" => body.bytesize.to_s
      },
      [ body ] ]
  end
end
