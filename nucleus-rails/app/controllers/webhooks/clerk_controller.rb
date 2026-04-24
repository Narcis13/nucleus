module Webhooks
  # Receives Clerk-emitted events (signed via Svix) and projects them into
  # our local Professional records. ActionController::API, so no CSRF.
  class ClerkController < ActionController::API
    # Maps Clerk org role strings to our Professional#role enum.
    # Clerk's admin/moderator/member names may vary per instance configuration;
    # anything not mapped here falls to "member" rather than failing loudly.
    CLERK_ROLE_TO_APP_ROLE = {
      "org:admin" => "owner",
      "admin" => "owner",
      "org:member" => "member",
      "member" => "member"
    }.freeze

    def create
      payload = request.body.read
      headers = {
        "svix-id" => request.headers["svix-id"],
        "svix-timestamp" => request.headers["svix-timestamp"],
        "svix-signature" => request.headers["svix-signature"]
      }

      event = verify!(payload, headers)
      return head :bad_request unless event

      handle_event(event)
      head :ok
    end

    private

    def handle_event(event)
      case event[:type]
      when "user.created", "user.updated"
        Professional.upsert_from_clerk!(ClerkUserPayload.new(event[:data]))
      when "user.deleted"
        Professional.where(clerk_user_id: event[:data][:id]).destroy_all
      when "organization.created", "organization.updated", "organization.deleted"
        # Organization model lands in Rs3. Log the event so it's visible
        # in dev; no-op until we have something to project into.
        Rails.logger.info("[clerk-webhook] #{event[:type]} org_id=#{event[:data][:id]}")
      when "organizationMembership.created", "organizationMembership.updated"
        upsert_membership(event[:data])
      when "organizationMembership.deleted"
        clear_membership(event[:data])
      else
        Rails.logger.info("[clerk-webhook] unhandled event: #{event[:type]}")
      end
    end

    def upsert_membership(data)
      clerk_user_id = data.dig(:public_user_data, :user_id)
      clerk_org_id = data.dig(:organization, :id)
      app_role = CLERK_ROLE_TO_APP_ROLE.fetch(data[:role], "member")
      return if clerk_user_id.blank? || clerk_org_id.blank?

      pro = Professional.find_by(clerk_user_id: clerk_user_id)
      return unless pro

      pro.update!(clerk_org_id: clerk_org_id, role: app_role)
    end

    def clear_membership(data)
      clerk_user_id = data.dig(:public_user_data, :user_id)
      return if clerk_user_id.blank?

      Professional.where(clerk_user_id: clerk_user_id).update_all(clerk_org_id: nil)
    end

    def verify!(payload, headers)
      secret = ENV["CLERK_WEBHOOK_SECRET"]
      return nil if secret.blank? || secret == "whsec_placeholder"

      wh = Svix::Webhook.new(secret)
      # Svix#verify returns the already-parsed JSON payload (or nil if empty).
      wh.verify(payload, headers)
    rescue Svix::WebhookVerificationError, JSON::ParserError => e
      Rails.logger.warn("Clerk webhook verification failed: #{e.class} #{e.message}")
      nil
    end

    # Adapts the Clerk webhook JSON shape (symbolized hash) to the duck-typed
    # interface Professional.upsert_from_clerk! reads.
    class ClerkUserPayload
      def initialize(data)
        @data = data
      end

      def id = @data[:id]
      def first_name = @data[:first_name]
      def last_name = @data[:last_name]

      def email_addresses
        Array(@data[:email_addresses]).map { |e| EmailAddress.new(e[:email_address]) }
      end

      EmailAddress = Struct.new(:email_address)
    end
  end
end
