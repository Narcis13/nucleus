module Ui
  class BadgeComponentPreview < ViewComponent::Preview
    def default;     render(Ui::BadgeComponent.new)                          { "Draft" }; end
    def primary;     render(Ui::BadgeComponent.new(variant: :primary))       { "Active" }; end
    def success;     render(Ui::BadgeComponent.new(variant: :success))       { "Paid" }; end
    def warning;     render(Ui::BadgeComponent.new(variant: :warning))       { "Overdue" }; end
    def destructive; render(Ui::BadgeComponent.new(variant: :destructive))   { "Canceled" }; end
    def info;        render(Ui::BadgeComponent.new(variant: :info))          { "New" }; end
  end
end
