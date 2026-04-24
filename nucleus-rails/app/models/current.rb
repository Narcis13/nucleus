class Current < ActiveSupport::CurrentAttributes
  # Cleared automatically between requests by Rails. Set by
  # ApplicationController on every request and by Auditable as a fallback
  # when a model is mutated outside an HTTP path (e.g. a Rake task).
  #
  # request_meta captures what we need for audit rows (:ip, :user_agent);
  # organization_membership is resolved once per request so policies can
  # read role without re-querying.
  attribute :professional, :organization, :organization_membership, :request_meta,
            :personal_access_token

  def request_meta
    super || {}
  end
end
