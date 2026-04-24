module Api
  module TokenAuth
    # Authenticates an /api/v1 request by the Authorization: Bearer header.
    #
    # Flow:
    #   1. Parse header → [pat_id, secret] or nil.
    #   2. Phase 1 (BYPASSRLS): look up PAT by id. This is identity
    #      resolution — the same justification as looking up a Clerk user
    #      before pinning the tenant.
    #   3. Set Current.professional / Current.organization from the row.
    #   4. Wrap the action body in ApplicationRecord.with_tenant_setting,
    #      which flips to the `authenticated` role (no BYPASSRLS) and sets
    #      both GUCs.
    #   5. Phase 2 (RLS-enforced): refetch the PAT inside the block. If the
    #      org was deleted, or RLS otherwise hides the row, it's a 401.
    #      This closes the "leaked token from a deleted tenant" hole.
    #   6. Constant-time bcrypt compare on the secret. Then revoked/expired
    #      checks. Only then does the action run.
    #
    # Cross-tenant requests (a token for tenant A asking for tenant B's
    # /api/v1/clients/:id) surface as 404, not 403, because the resource
    # is invisible under RLS. No information leak on existence.
    extend ActiveSupport::Concern

    included do
      around_action :authenticate_with_personal_access_token!
      helper_method :current_personal_access_token if respond_to?(:helper_method)
    end

    private

    def authenticate_with_personal_access_token!
      pat_id, secret = PersonalAccessToken.parse_presented(request.headers["Authorization"])

      if pat_id.nil? || secret.nil?
        return render_api_error(code: :unauthenticated, status: :unauthorized,
                                message: "Missing or malformed Authorization header")
      end

      pat = PersonalAccessToken.unscoped.find_by(id: pat_id)
      if pat.nil? || !pat.authenticate_secret(secret)
        return render_api_error(code: :unauthenticated, status: :unauthorized,
                                message: "Invalid credentials")
      end

      if pat.revoked?
        return render_api_error(code: :unauthenticated, status: :unauthorized,
                                message: "Token revoked")
      end

      if pat.expired?
        return render_api_error(code: :unauthenticated, status: :unauthorized,
                                message: "Token expired")
      end

      Current.professional = pat.professional
      Current.organization = pat.organization
      Current.personal_access_token = pat
      Current.request_meta = { ip: request.remote_ip, user_agent: request.user_agent }

      ApplicationRecord.with_tenant_setting(
        professional_id: pat.professional_id,
        organization_id: pat.organization_id
      ) do
        # Verifying refetch: the row must be visible under RLS. If the org
        # has been deleted or the token is otherwise hidden, bail before
        # running the action.
        verified = PersonalAccessToken.find_by(id: pat.id)
        if verified.nil?
          render_api_error(code: :unauthenticated, status: :unauthorized,
                           message: "Tenant unavailable")
          next
        end

        touch_last_used_at!(pat)
        yield
      end
    rescue ActiveRecord::RecordNotFound
      render_api_error(code: :not_found, status: :not_found, message: "Not found")
    end

    def current_personal_access_token
      Current.personal_access_token
    end

    # Enforces a scope on an action. Usage:
    #   before_action -> { require_scope!("clients:write") }, only: %i[create update]
    # 404 is deliberate when the token is missing; 403 when present but
    # insufficient — mirrors the "don't confirm existence to an unauth'd
    # caller" rule the request specs enforce.
    def require_scope!(scope)
      pat = Current.personal_access_token
      return render_api_error(code: :unauthenticated, status: :unauthorized, message: "Not authenticated") if pat.nil?
      return if pat.has_scope?(scope)
      render_api_error(code: :forbidden, status: :forbidden,
                       message: "Missing required scope: #{scope}")
    end

    # Only touch once per minute to avoid write amplification under burst
    # traffic. Skipped cleanly when the column was last updated recently.
    def touch_last_used_at!(pat)
      return if pat.last_used_at.present? && pat.last_used_at > 1.minute.ago
      pat.update_column(:last_used_at, Time.current)
    rescue ActiveRecord::ActiveRecordError
      # Don't fail the request because we couldn't bump a stat column.
      nil
    end
  end
end
