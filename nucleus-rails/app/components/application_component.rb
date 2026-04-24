class ApplicationComponent < ViewComponent::Base
  # Flatten + dedupe class strings so component callers can pass arrays,
  # strings, or nils without the component having to care.
  def css(*args)
    args.flatten.compact.reject(&:blank?).join(" ").squeeze(" ").strip
  end
end
