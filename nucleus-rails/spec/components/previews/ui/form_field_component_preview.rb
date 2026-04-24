module Ui
  class FormFieldComponentPreview < ViewComponent::Preview
    def default
      render_with_template(template: "ui/form_field_component_preview/default")
    end
  end
end
