require "bcrypt"
require "securerandom"

class PersonalAccessToken < ApplicationRecord
  # Anatomy of a presented token:
  #   "nuc_pat_<pat_id_hex>.<secret>"
  #
  # The pat_id_hex is the row's primary key (UUID, dashes stripped) and
  # serves as the indexed lookup. The secret is the part we bcrypt-digest.
  # We never store plaintext: the user sees it once at issue time, and the
  # Issue service returns it in the Result payload so a controller can flash
  # it exactly once.
  #
  # RLS on organization_id keeps cross-tenant tokens invisible under a
  # tenant context. The initial auth lookup (in Api::TokenAuth) runs under
  # BYPASSRLS — same justification as Clerk session bootstrap — and then
  # re-verifies inside with_tenant_setting so a revoked/deleted-tenant row
  # can't leak data.

  PREFIX = "nuc_pat_".freeze
  SECRET_BYTES = 24
  BCRYPT_COST = (Rails.env.test? ? BCrypt::Engine::MIN_COST : BCrypt::Engine::DEFAULT_COST)

  belongs_to :professional
  belongs_to :organization

  validates :name, presence: true, length: { maximum: 80 }
  validates :scopes, presence: true
  validate  :scopes_must_be_array_of_strings

  # In-memory only — set by #issue! / by_presented_token so the caller can
  # show it to the user or verify against the digest. Never persisted.
  attr_accessor :plaintext

  scope :active, -> { where(revoked_at: nil).where("expires_at IS NULL OR expires_at > ?", Time.current) }

  # Parses a presented header value like "nuc_pat_<id>.<secret>" and returns
  # [pat_id, secret] or nil when malformed. Constant-time only on the secret
  # comparison later; the id split is a plain string op because knowing a
  # pat_id without the secret grants nothing.
  def self.parse_presented(raw)
    return nil if raw.blank?
    stripped = raw.to_s.sub(/\ABearer\s+/i, "").strip
    return nil unless stripped.start_with?(PREFIX)

    body = stripped[PREFIX.length..]
    pat_id_hex, secret = body.split(".", 2)
    return nil if pat_id_hex.blank? || secret.blank?
    return nil unless pat_id_hex.match?(/\A[0-9a-f]{32}\z/)

    [ hex_to_uuid(pat_id_hex), secret ]
  end

  # Compares the presented secret to the stored bcrypt digest. BCrypt::Password#==
  # is constant-time, which is what we need to avoid timing oracles on the
  # secret half of the token.
  def authenticate_secret(secret)
    BCrypt::Password.new(token_digest) == secret
  rescue BCrypt::Errors::InvalidHash
    false
  end

  def revoked?
    revoked_at.present?
  end

  def expired?
    expires_at.present? && expires_at.past?
  end

  def active?
    !revoked? && !expired?
  end

  # "clients:read" matches scope "clients:read" OR "clients:write"; "write"
  # implies "read" for the same resource. Keeping this explicit instead of
  # inferring it from string split so a future "clients:admin" can stay
  # out of the implication graph.
  def has_scope?(required)
    return false if scopes.blank?
    required = required.to_s
    return true if scopes.include?(required)

    resource, action = required.split(":", 2)
    return false unless action == "read"
    scopes.include?("#{resource}:write")
  end

  def to_partial_path
    "settings/personal_access_tokens/personal_access_token"
  end

  def self.hex_to_uuid(hex)
    return nil unless hex&.length == 32
    "#{hex[0, 8]}-#{hex[8, 4]}-#{hex[12, 4]}-#{hex[16, 4]}-#{hex[20, 12]}"
  end

  def self.uuid_to_hex(uuid)
    uuid.to_s.delete("-")
  end

  # Builds the plaintext header value for a just-issued token. Called by the
  # Issue service after .save!; paired with #plaintext so controllers can
  # flash it to the user exactly once.
  def self.present_token(pat_id, secret)
    "#{PREFIX}#{uuid_to_hex(pat_id)}.#{secret}"
  end

  private

  def scopes_must_be_array_of_strings
    unless scopes.is_a?(Array) && scopes.all? { |s| s.is_a?(String) && s.present? }
      errors.add(:scopes, "must be a non-empty array of strings")
    end
  end
end
