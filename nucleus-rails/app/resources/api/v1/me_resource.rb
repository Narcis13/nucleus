module Api
  module V1
    class MeResource < ApplicationResource
      # GET /api/v1/me — the smallest endpoint that exercises auth, tenant
      # context, and scope reporting end-to-end. Shape is intentionally
      # shallow; richer "profile" fields can join later without breaking
      # consumers because alba only renders declared attributes.

      attributes :id, :full_name, :email

      attribute :organization do |pro|
        org = Current.organization
        next nil unless org
        { id: org.id, name: org.name, slug: org.slug }
      end

      attribute :token do |_pro|
        pat = Current.personal_access_token
        next nil unless pat
        {
          id: pat.id,
          name: pat.name,
          scopes: pat.scopes,
          last_used_at: pat.last_used_at&.iso8601,
          expires_at: pat.expires_at&.iso8601
        }
      end
    end
  end
end
