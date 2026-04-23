class CreateClients < ActiveRecord::Migration[8.1]
  def change
    create_table :clients, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :full_name
      t.string :email
      t.string :phone
      t.references :professional, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end
  end
end
