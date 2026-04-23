module ApplicationCable
  # Authenticates the WebSocket handshake using the Clerk session that
  # the Clerk::Rack::Middleware has already resolved on the HTTP upgrade
  # request. `request.env["clerk"]` is a Clerk::Proxy — same contract
  # the HTTP controllers read via ClerkAuthenticatable.
  class Connection < ActionCable::Connection::Base
    identified_by :current_professional

    def connect
      self.current_professional = find_verified_professional
    end

    private

    def find_verified_professional
      clerk = request.env["clerk"]
      reject_unauthorized_connection unless clerk&.user?

      Professional.find_by(clerk_user_id: clerk.user_id) ||
        reject_unauthorized_connection
    end
  end
end
