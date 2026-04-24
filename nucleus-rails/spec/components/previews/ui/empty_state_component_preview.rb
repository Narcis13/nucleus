module Ui
  class EmptyStateComponentPreview < ViewComponent::Preview
    def default
      render(Ui::EmptyStateComponent.new(
        icon: "📭",
        title: "No clients yet",
        description: "Add your first client to start tracking conversations and documents."
      ))
    end

    def with_action
      render_with_template(template: "ui/empty_state_component_preview/with_action")
    end
  end
end
