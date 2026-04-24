module Ui
  class KanbanComponentPreview < ViewComponent::Preview
    Item = Struct.new(:id, :title, keyword_init: true) do
      def to_s; title; end
    end

    def default
      render(Ui::KanbanComponent.new(columns: [
        { id: "new",      name: "New",       items: [ Item.new(id: 1, title: "Ava Singh"),  Item.new(id: 2, title: "Ben Rivera") ] },
        { id: "active",   name: "Active",    items: [ Item.new(id: 3, title: "Cleo Park") ] },
        { id: "archived", name: "Archived",  items: [] }
      ]))
    end
  end
end
