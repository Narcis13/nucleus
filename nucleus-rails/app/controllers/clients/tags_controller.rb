module Clients
  class TagsController < ApplicationController
    layout "dashboard"

    before_action :require_clerk_user!
    before_action :require_active_organization!
    before_action :load_client
    before_action :load_tag

    def create
      authorize @client, :attach_tag?
      Clients::AttachTag.call(client: @client, tag: @tag, actor: Current.professional)
      redirect_to client_path(@client), notice: "Tag #{@tag.name} added."
    end

    def destroy
      authorize @client, :detach_tag?
      Clients::DetachTag.call(client: @client, tag: @tag, actor: Current.professional)
      redirect_to client_path(@client), notice: "Tag #{@tag.name} removed.", status: :see_other
    end

    private

    def load_client
      @client = policy_scope(Client).find(params[:client_id])
    end

    def load_tag
      tag_id = params[:id] || params[:tag_id] || params.dig(:tag, :id) || params.dig(:client_tag, :tag_id)
      @tag = policy_scope(Tag).find(tag_id) if tag_id.present?
      head :unprocessable_content unless @tag
    end

    def require_active_organization!
      return if Current.organization.present?
      redirect_to dashboard_path, alert: "Join or create an organization first."
    end
  end
end
