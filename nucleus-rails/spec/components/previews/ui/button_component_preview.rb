module Ui
  class ButtonComponentPreview < ViewComponent::Preview
    # @!group Variants
    def primary;     render(Ui::ButtonComponent.new(variant: :primary))     { "Save client" }; end
    def secondary;   render(Ui::ButtonComponent.new(variant: :secondary))   { "Cancel" }; end
    def ghost;       render(Ui::ButtonComponent.new(variant: :ghost))       { "Dismiss" }; end
    def destructive; render(Ui::ButtonComponent.new(variant: :destructive)) { "Delete" }; end
    # @!endgroup

    # @!group Sizes
    def size_sm; render(Ui::ButtonComponent.new(size: :sm)) { "Small" }; end
    def size_md; render(Ui::ButtonComponent.new(size: :md)) { "Medium" }; end
    def size_lg; render(Ui::ButtonComponent.new(size: :lg)) { "Large" }; end
    # @!endgroup

    def as_link
      render(Ui::ButtonComponent.new(variant: :secondary, href: "#")) { "Go somewhere" }
    end

    def disabled
      render(Ui::ButtonComponent.new(disabled: true)) { "Processing…" }
    end
  end
end
