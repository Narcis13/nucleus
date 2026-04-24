module Ui
  # Thin wrapper over Simple Form's `f.input` so form markup in views stays
  # uniform (label/hint/error styling defined once in the simple_form
  # initializer). Kept intentionally small — reach for `f.input` directly
  # for advanced cases.
  class FormFieldComponent < ApplicationComponent
    def initialize(form:, attribute:, label: nil, hint: nil, required: nil, as: nil, collection: nil, **input_html)
      @form       = form
      @attribute  = attribute
      @label      = label
      @hint       = hint
      @required   = required
      @as         = as
      @collection = collection
      @input_html = input_html
    end

    def call
      opts = { label: @label, hint: @hint, required: @required, input_html: @input_html }.compact
      opts[:as]         = @as         if @as
      opts[:collection] = @collection if @collection
      @form.input(@attribute, **opts)
    end
  end
end
