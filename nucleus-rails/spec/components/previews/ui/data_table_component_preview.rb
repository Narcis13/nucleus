module Ui
  class DataTableComponentPreview < ViewComponent::Preview
    Row = Struct.new(:id, :name, :email, :status, keyword_init: true)

    def default
      rows = [
        Row.new(id: 1, name: "Ava Singh",  email: "ava@example.com",  status: "Active"),
        Row.new(id: 2, name: "Ben Rivera", email: "ben@example.com",  status: "Lead"),
        Row.new(id: 3, name: "Cleo Park",  email: "cleo@example.com", status: "Archived")
      ]

      render(Ui::DataTableComponent.new(
        rows: rows,
        columns: [
          { key: :name,   label: "Name"   },
          { key: :email,  label: "Email"  },
          { key: :status, label: "Status" }
        ]
      ))
    end

    def empty
      render(Ui::DataTableComponent.new(rows: [], columns: [ { key: :name, label: "Name" } ]))
    end
  end
end
