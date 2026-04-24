module Ui
  # Kanban board. The actual drag/drop wire-up lands in Rs6 (leads pipeline);
  # this component renders the structure + hooks needed so Sortable.js binds
  # at that point without shape changes.
  #
  #   <%= render Ui::KanbanComponent.new(
  #         columns: [
  #           { id: 1, name: "New",    items: @new_leads   },
  #           { id: 2, name: "Active", items: @active_leads }
  #         ],
  #         update_url: leads_path, # nil in previews / Rs4
  #         item_partial: "leads/card",
  #         item_locals_key: :lead
  #       ) %>
  class KanbanComponent < ApplicationComponent
    def initialize(columns:, update_url: nil, item_partial: nil, item_locals_key: :item)
      @columns         = columns
      @update_url      = update_url
      @item_partial    = item_partial
      @item_locals_key = item_locals_key
    end

    attr_reader :columns, :update_url, :item_partial, :item_locals_key
  end
end
