Pay.setup do |config|
  config.application_name = ENV.fetch("PAY_APPLICATION_NAME", "Nucleus")
  config.business_name    = ENV.fetch("PAY_BUSINESS_NAME",    "Nucleus Rails Spike")
  config.business_address = ENV.fetch("PAY_BUSINESS_ADDRESS", "Bucharest, RO")

  config.default_product_name = "Nucleus Subscription"
  config.default_plan_name    = "starter"

  config.enabled_processors = [:stripe]
end
