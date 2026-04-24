module PersonalAccessTokens
  class Revoke < ApplicationService
    # Idempotent. A second revoke of an already-revoked token is a no-op
    # success, because from the caller's perspective the post-condition
    # ("this token no longer authenticates") is satisfied either way.

    def initialize(personal_access_token:)
      @personal_access_token = personal_access_token
    end

    def call
      pat = @personal_access_token
      pat.update!(revoked_at: Time.current) unless pat.revoked?
      success(personal_access_token: pat)
    end
  end
end
