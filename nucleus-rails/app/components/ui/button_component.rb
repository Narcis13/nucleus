module Ui
  class ButtonComponent < ApplicationComponent
    VARIANTS = {
      primary:     "bg-primary text-primary-fg hover:opacity-90 focus-visible:ring-primary",
      secondary:   "bg-surface-2 text-fg border border-border hover:bg-surface focus-visible:ring-ring",
      ghost:       "text-fg hover:bg-surface-2 focus-visible:ring-ring",
      destructive: "bg-danger text-white hover:opacity-90 focus-visible:ring-danger"
    }.freeze

    SIZES = {
      sm: "h-8  px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-5 text-base"
    }.freeze

    def initialize(variant: :primary, size: :md, type: "button", href: nil, disabled: false, class: nil, **html_attrs)
      @variant  = variant.to_sym
      @size     = size.to_sym
      @type     = type
      @href     = href
      @disabled = disabled
      @extra    = binding.local_variable_get(:class)
      @html     = html_attrs
    end

    def call
      if @href
        link_to @href, **html_attributes do
          content
        end
      else
        button_tag(type: @type, disabled: @disabled, **html_attributes) do
          content
        end
      end
    end

    private

    def html_attributes
      base = @html.dup
      base[:class] = classes
      base
    end

    def classes
      css(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS.fetch(@variant, VARIANTS[:primary]),
        SIZES.fetch(@size, SIZES[:md]),
        @extra
      )
    end
  end
end
