module Settings
  class PersonalAccessTokensController < ApplicationController
    layout "dashboard"

    before_action :require_clerk_user!
    before_action :require_active_organization!
    before_action :load_token, only: %i[revoke]

    def index
      @tokens = policy_scope(PersonalAccessToken).order(created_at: :desc)
      authorize PersonalAccessToken
    end

    def new
      @token = PersonalAccessToken.new
      authorize @token
    end

    def create
      authorize PersonalAccessToken
      result = PersonalAccessTokens::Issue.call(
        professional: Current.professional,
        organization: Current.organization,
        name: params.dig(:personal_access_token, :name),
        scopes: scope_params,
        expires_at: expires_at_param
      )

      if result.success?
        # The plaintext is stored in flash for exactly one redirect so the
        # user can copy it; it's wiped after the next render. No database
        # path ever sees the plaintext again.
        redirect_to settings_personal_access_tokens_path,
                    flash: { plaintext_token: result.plaintext, notice: "Token created. Copy it now — it won't be shown again." }
      else
        @token = result[:personal_access_token] || PersonalAccessToken.new
        flash.now[:alert] = "Could not issue token."
        render :new, status: :unprocessable_content
      end
    end

    def revoke
      authorize @token, :revoke?
      PersonalAccessTokens::Revoke.call(personal_access_token: @token)
      redirect_to settings_personal_access_tokens_path, notice: "Token revoked."
    end

    private

    def load_token
      @token = policy_scope(PersonalAccessToken).find(params[:id])
    end

    def scope_params
      raw = params.dig(:personal_access_token, :scopes)
      return [] if raw.blank?
      raw.is_a?(Array) ? raw : raw.to_s.split(/[\s,]+/).reject(&:blank?)
    end

    def expires_at_param
      raw = params.dig(:personal_access_token, :expires_at)
      return nil if raw.blank?
      Time.zone.parse(raw.to_s)
    end

    def require_active_organization!
      return if Current.organization.present?
      redirect_to dashboard_path, alert: "Join or create an organization before issuing API tokens."
    end
  end
end
