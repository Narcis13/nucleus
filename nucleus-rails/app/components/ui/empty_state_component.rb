module Ui
  class EmptyStateComponent < ApplicationComponent
    renders_one :action

    def initialize(title:, description: nil, icon: nil)
      @title       = title
      @description = description
      @icon        = icon
    end

    attr_reader :title, :description, :icon
  end
end
