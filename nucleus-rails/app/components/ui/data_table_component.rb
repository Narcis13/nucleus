module Ui
  # Generic table component.
  #
  #   <%= render Ui::DataTableComponent.new(
  #         rows: @clients,
  #         columns: [
  #           { key: :name,  label: "Name",  sort: "name" },
  #           { key: :email, label: "Email" }
  #         ],
  #         ransack: @q,
  #         pagy: @pagy
  #       ) %>
  #
  # When `ransack` is passed, sortable columns become links bound to
  # `@q.sorts`. When `pagy` is passed, a Pagy nav is rendered in the footer.
  # Either can be nil.
  class DataTableComponent < ApplicationComponent
    renders_one :empty
    renders_one :bulk_actions

    Column = Struct.new(:key, :label, :sort, :formatter, keyword_init: true) do
      # Formatter receives (row, helpers). Use helpers.link_to etc inside it.
      def resolve(row, helpers)
        return formatter.call(row, helpers) if formatter
        return row.public_send(key) if row.respond_to?(key)
        row[key]
      end
    end

    def initialize(rows:, columns:, ransack: nil, pagy: nil, id: nil, class: nil)
      @rows     = rows
      @columns  = columns.map { |c| c.is_a?(Column) ? c : Column.new(**c) }
      @ransack  = ransack
      @pagy     = pagy
      @id       = id
      @extra    = binding.local_variable_get(:class)
    end

    attr_reader :rows, :columns, :ransack, :pagy, :id

    def empty_state?
      rows.to_a.empty?
    end

    def wrapper_classes
      css("rounded-lg border border-border bg-surface overflow-hidden", @extra)
    end

    def sort_link_for(column)
      return helpers.content_tag(:span, column.label) unless ransack && column.sort.present?

      helpers.sort_link(ransack, column.sort, column.label, { default_order: :asc }, class: "inline-flex items-center gap-1")
    end
  end
end
