module Webhooks
  # Receives Clerk-emitted events (signed via Svix) and projects them into
  # our local Professional / Organization / OrganizationMembership records.
  # ActionController::API, so no CSRF and no ApplicationController callbacks
  # — webhook traffic runs as the `postgres` role (BYPASSRLS), which is the
  # right posture for system-level provisioning.
  class ClerkController < ActionController::API
    # Maps Clerk org role strings to our membership role enum. Clerk's role
    # naming varies per instance configuration; anything not mapped falls
    # to "member" rather than failing loudly.
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
      when "organization.created", "organization.updated"
        Organization.upsert_from_clerk!(event[:data])
      when "organization.deleted"
        Organization.where(clerk_org_id: event[:data][:id]).destroy_all
      when "organizationMembership.created", "organizationMembership.updated"
        upsert_membership(event[:data])
      when "organizationMembership.deleted"
        remove_membership(event[:data])
      else
        Rails.logger.info("[clerk-webhook] unhandled event: #{event[:type]}")
      end
    end

    def upsert_membership(data)
      clerk_user_id = data.dig(:public_user_data, :user_id)
      clerk_org_id  = data.dig(:organization, :id)
      app_role = CLERK_ROLE_TO_APP_ROLE.fetch(data[:role], "member")
      return if clerk_user_id.blank? || clerk_org_id.blank?

      pro = Professional.find_by(clerk_user_id: clerk_user_id)
      return unless pro

      # An organization.created event may not have fired (Clerk sometimes
      # emits membership events before org events for newly-created orgs);
      # upsert the Organization on the spot using whatever identity Clerk
      # sent alongside the membership.
      org = Organization.upsert_from_clerk!(data[:organization])

      # Set Current.organization so the Auditable callback on the membership
      # create/update writes a scoped audit row (actor_id stays nil — no
      # authenticated user on the webhook path).
      Current.organization = org
      begin
        membership = OrganizationMembership.find_or_initialize_by(
          professional: pro, organization: org
        )
        membership.role = app_role
        membership.save!

        # Rs2 back-compat: the dashboard still reads
        # current_professional.clerk_org_id to pick the active org. Keep it
        # in sync until Rs5 reads from memberships directly.
        pro.update!(clerk_org_id: clerk_org_id, role: app_role)
      ensure
        Current.organization = nil
      end
    end

    def remove_membership(data)
      clerk_user_id = data.dig(:public_user_data, :user_id)
      clerk_org_id  = data.dig(:organization, :id)
      return if clerk_user_id.blank?

      pro = Professional.find_by(clerk_user_id: clerk_user_id)
      return unless pro

      scope = OrganizationMembership.where(professional_id: pro.id)
      if clerk_org_id.present? && (org = Organization.find_by(clerk_org_id: clerk_org_id))
        Current.organization = org
        begin
          scope.where(organization_id: org.id).destroy_all
        ensure
          Current.organization = nil
        end
      else
        # No org id on the event — clear every membership for this user.
        scope.destroy_all
      end

      # Clear Professional.clerk_org_id only if the deleted membership was
      # the one currently stamped on it; otherwise a second org the user
      # belongs to would get stomped.
      if clerk_org_id.present? && pro.clerk_org_id == clerk_org_id
        pro.update!(clerk_org_id: nil)
      elsif clerk_org_id.blank?
        pro.update!(clerk_org_id: nil)
      end
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
