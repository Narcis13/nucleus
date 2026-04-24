class TagsController < ApplicationController
  layout "dashboard"

  before_action :require_clerk_user!
  before_action :require_active_organization!
  before_action :load_tag, only: %i[edit update destroy]

  def index
    authorize Tag
    @tags = policy_scope(Tag).order(:name)
  end

  def new
    authorize Tag
    @tag = Tag.new(color: Tag::DEFAULT_COLOR)
  end

  def edit
    authorize @tag
  end

  def create
    authorize Tag
    result = Tags::Create.call(
      attrs: tag_params,
      actor: Current.professional,
      organization: Current.organization
    )

    if result.success?
      redirect_to tags_path, notice: "Tag created."
    else
      @tag = result.tag || Tag.new(tag_params)
      flash.now[:alert] = "Could not create tag."
      render :new, status: :unprocessable_content
    end
  end

  def update
    authorize @tag
    if @tag.update(tag_params)
      redirect_to tags_path, notice: "Tag updated."
    else
      flash.now[:alert] = "Could not update tag."
      render :edit, status: :unprocessable_content
    end
  end

  def destroy
    authorize @tag
    @tag.destroy
    redirect_to tags_path, notice: "Tag deleted.", status: :see_other
  end

  private

  def load_tag
    @tag = policy_scope(Tag).find(params[:id])
  end

  def tag_params
    params.require(:tag).permit(:name, :color)
  end

  def require_active_organization!
    return if Current.organization.present?
    redirect_to dashboard_path, alert: "Join or create an organization first."
  end
end
