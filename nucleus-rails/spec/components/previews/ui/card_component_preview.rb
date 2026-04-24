module Ui
  class CardComponentPreview < ViewComponent::Preview
    def default
      render(Ui::CardComponent.new(title: "Client overview",
                                   subtitle: "Profile + latest activity"))
    end

    def with_slots
      render_with_template(template: "ui/card_component_preview/with_slots")
    end

    def no_header
      render(Ui::CardComponent.new) { "Plain card body — good for list containers." }
    end
  end
end
