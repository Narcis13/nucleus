SecureHeaders::Configuration.default do |config|
  config.x_frame_options = "SAMEORIGIN"
  config.x_content_type_options = "nosniff"
  config.x_xss_protection = "1; mode=block"
  config.referrer_policy = %w[strict-origin-when-cross-origin]

  config.csp = SecureHeaders::OPT_OUT
end
