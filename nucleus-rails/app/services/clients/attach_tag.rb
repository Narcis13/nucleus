module Clients
  class AttachTag < ApplicationService
    # Idempotent: re-attaching the same tag is a success no-op. Controllers
    # don't need to defensively check for duplicates. The DB unique index on
    # (client_id, tag_id) would raise RecordNotUnique on a race, which we
    # swallow as the same success outcome.

    def initialize(client:, tag:, actor:)
      @client = client
      @tag = tag
      @actor = actor
    end

    def call
      if @client.organization_id != @tag.organization_id
        return failure(:invalid, message: "tag belongs to another organization")
      end

      join = ClientTag.find_or_initialize_by(client_id: @client.id, tag_id: @tag.id)
      if join.new_record?
        begin
          join.save!
        rescue ActiveRecord::RecordNotUnique
          # Race with another request: the tag is attached, which is what the
          # caller wanted. Swallow.
        end
      end

      success(client_tag: join, client: @client, tag: @tag)
    end
  end
end
