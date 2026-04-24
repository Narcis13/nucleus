module PersonalAccessTokens
  class Issue < ApplicationService
    # Issues a new PAT for the acting professional in their active
    # organization. The plaintext is generated here, bcrypt-hashed before
    # persistence, and returned on the Result exactly once. The caller
    # (dashboard controller or — later — an admin API) is responsible for
    # flashing it to the user; no code path persists the plaintext.

    def initialize(professional:, organization:, name:, scopes:, expires_at: nil)
      @professional = professional
      @organization = organization
      @name = name.to_s.strip
      @scopes = Array(scopes).map(&:to_s).reject(&:blank?).uniq
      @expires_at = expires_at
    end

    def call
      secret = SecureRandom.hex(PersonalAccessToken::SECRET_BYTES)

      pat = PersonalAccessToken.new(
        professional: @professional,
        organization: @organization,
        name: @name,
        scopes: @scopes,
        expires_at: @expires_at,
        token_digest: BCrypt::Password.create(secret, cost: PersonalAccessToken::BCRYPT_COST)
      )

      return failure(:invalid, errors: pat.errors) unless pat.save

      plaintext = PersonalAccessToken.present_token(pat.id, secret)
      pat.plaintext = plaintext

      success(personal_access_token: pat, plaintext: plaintext)
    end
  end
end
