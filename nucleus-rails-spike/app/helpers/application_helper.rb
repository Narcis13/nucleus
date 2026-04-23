require "base64"

module ApplicationHelper
  # Clerk publishable keys encode the frontend API host.
  # pk_test_Z2VuZXJvdXMtZmFsY29uLTI2LmNsZXJrLmFjY291bnRzLmRldiQ
  #   → base64("generous-falcon-26.clerk.accounts.dev$")
  def clerk_frontend_api_host
    key = ENV["CLERK_PUBLISHABLE_KEY"].to_s
    return nil if key.empty?

    encoded = key.sub(/\Apk_(test|live)_/, "")
    Base64.decode64(encoded).chomp("$")
  end

  def clerk_js_url
    host = clerk_frontend_api_host
    return nil unless host
    "https://#{host}/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
  end
end
