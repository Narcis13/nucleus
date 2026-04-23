module Webhooks
  class ClerkController < ActionController::API
    def create
      payload = request.body.read
      headers = {
        "svix-id"        => request.headers["svix-id"],
        "svix-timestamp" => request.headers["svix-timestamp"],
        "svix-signature" => request.headers["svix-signature"]
      }

      event = verify!(payload, headers)
      return head :bad_request unless event

      case event[:type]
      when "user.created", "user.updated"
        Professional.upsert_from_clerk!(ClerkUserPayload.new(event[:data]))
      when "user.deleted"
        Professional.where(clerk_user_id: event[:data]["id"]).destroy_all
      end

      head :ok
    end

    private

    def verify!(payload, headers)
      secret = ENV["CLERK_WEBHOOK_SECRET"]
      return nil if secret.blank? || secret == "whsec_placeholder"

      wh = Svix::Webhook.new(secret)
      JSON.parse(wh.verify(payload, headers), symbolize_names: true)
    rescue Svix::WebhookVerificationError, JSON::ParserError => e
      Rails.logger.warn("Clerk webhook verification failed: #{e.class} #{e.message}")
      nil
    end

    # Adapts the Clerk webhook JSON shape to the duck-typed interface
    # that Professional.upsert_from_clerk! expects.
    class ClerkUserPayload
      def initialize(data)
        @data = data
      end

      def id = @data["id"]
      def first_name = @data["first_name"]
      def last_name = @data["last_name"]

      def email_addresses
        Array(@data["email_addresses"]).map { |e| EmailAddress.new(e["email_address"]) }
      end

      EmailAddress = Struct.new(:email_address)
    end
  end
end
