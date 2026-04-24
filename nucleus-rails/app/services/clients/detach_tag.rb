module Clients
  class DetachTag < ApplicationService
    # Idempotent like AttachTag. Detaching a tag that's already absent
    # succeeds as a no-op — the caller's post-condition ("this tag is not
    # attached") is satisfied either way.

    def initialize(client:, tag:, actor:)
      @client = client
      @tag = tag
      @actor = actor
    end

    def call
      ClientTag.where(client_id: @client.id, tag_id: @tag.id).destroy_all
      success(client: @client, tag: @tag)
    end
  end
end
