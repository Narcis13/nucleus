module Ui
  class ModalComponentPreview < ViewComponent::Preview
    def closed
      render_with_template(template: "ui/modal_component_preview/closed")
    end

    def open
      render_with_template(template: "ui/modal_component_preview/open")
    end
  end
end
