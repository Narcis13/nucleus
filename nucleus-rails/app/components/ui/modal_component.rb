module Ui
  # Native <dialog> modal. Open via:
  #   <button data-action="modal#open" data-modal-id-param="my-modal">
  # Close via any element inside with `data-action="modal#close"`.
  # When opened inside a Turbo frame (`frame: "modal"`), the modal
  # auto-opens on load via the controller's connect hook.
  class ModalComponent < ApplicationComponent
    renders_one :header
    renders_one :footer

    def initialize(id:, title: nil, size: :md, open: false)
      @id    = id
      @title = title
      @size  = size.to_sym
      @open  = open
    end

    SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }.freeze

    attr_reader :id, :title, :open

    def size_class
      SIZES.fetch(@size, SIZES[:md])
    end

    def dialog_classes
      css(
        "fixed inset-0 m-auto rounded-lg border border-border bg-surface text-fg shadow-lg",
        "backdrop:bg-black/50 w-full", size_class, "p-0"
      )
    end
  end
end
