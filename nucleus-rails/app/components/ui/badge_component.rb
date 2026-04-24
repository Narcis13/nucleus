module Ui
  class BadgeComponent < ApplicationComponent
    VARIANTS = {
      default:     "bg-surface-2 text-fg border-border",
      primary:     "bg-primary/10 text-primary border-primary/20",
      success:     "bg-success/10 text-success border-success/20",
      warning:     "bg-warning/10 text-warning border-warning/30",
      destructive: "bg-danger/10  text-danger  border-danger/20",
      info:        "bg-info/10    text-info    border-info/20"
    }.freeze

    def initialize(variant: :default, class: nil)
      @variant = variant.to_sym
      @extra   = binding.local_variable_get(:class)
    end

    def call
      content_tag :span, content, class: classes
    end

    private

    def classes
      css(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        VARIANTS.fetch(@variant, VARIANTS[:default]),
        @extra
      )
    end
  end
end
