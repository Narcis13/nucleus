module Ui
  # A dismissable toast. Broadcast into the `#toasts` region of the
  # dashboard layout via Turbo Streams (Rs8+). In Rs4 it's usable directly
  # in previews and synchronously rendered for flash-style messages.
  #
  #   <%= render Ui::ToastComponent.new(variant: :success,
  #                                     title: "Saved",
  #                                     message: "Client updated.") %>
  class ToastComponent < ApplicationComponent
    VARIANTS = {
      notice:      "border-info/30    bg-info/10    text-info",
      success:     "border-success/30 bg-success/10 text-success",
      warning:     "border-warning/40 bg-warning/10 text-warning",
      alert:       "border-danger/30  bg-danger/10  text-danger",
      error:       "border-danger/30  bg-danger/10  text-danger",
      info:        "border-info/30    bg-info/10    text-info"
    }.freeze

    def initialize(message:, variant: :info, title: nil, dismiss_after: 5000)
      @message       = message
      @variant       = variant.to_sym
      @title         = title
      @dismiss_after = dismiss_after
    end

    attr_reader :message, :title, :dismiss_after

    def classes
      css(
        "pointer-events-auto w-full max-w-sm rounded-md border bg-surface shadow-[var(--shadow-card)] px-4 py-3 text-sm flex gap-3 items-start",
        VARIANTS.fetch(@variant, VARIANTS[:info])
      )
    end
  end
end
