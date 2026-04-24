module Ui
  class CardComponent < ApplicationComponent
    renders_one :header
    renders_one :footer

    def initialize(title: nil, subtitle: nil, padding: true, class: nil, **html_attrs)
      @title    = title
      @subtitle = subtitle
      @padding  = padding
      @extra    = binding.local_variable_get(:class)
      @html     = html_attrs
    end

    attr_reader :title, :subtitle, :padding

    def classes
      css("rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]", @extra)
    end

    def body_padding
      padding ? "p-5" : ""
    end
  end
end
