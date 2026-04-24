module Api
  module V1
    class BaseController < ActionController::API
      # Token-only. No cookies, no CSRF — if a future engineer adds cookie
      # auth back here, CSRF protection would silently disappear for every
      # browser session too. Rs4.5 ships a request spec that asserts a
      # signed-in cookie is ignored on this controller for exactly that
      # reason.
      #
      # We intentionally inherit from ActionController::API (not ::Base),
      # so there are no view helpers, flash, or session middleware to
      # worry about leaking.
      include Pagy::Backend
      include Api::TokenAuth
      include Api::ErrorHandling
      include Api::Pagination
    end
  end
end
