module Ui
  class ToastComponentPreview < ViewComponent::Preview
    def info;    render(Ui::ToastComponent.new(message: "Autosaved.", variant: :info,    dismiss_after: 0)); end
    def success; render(Ui::ToastComponent.new(message: "Client created.", title: "Saved", variant: :success, dismiss_after: 0)); end
    def warning; render(Ui::ToastComponent.new(message: "Running low on credits.",      variant: :warning, dismiss_after: 0)); end
    def error;   render(Ui::ToastComponent.new(message: "Something went wrong.",        variant: :error,   dismiss_after: 0)); end
  end
end
