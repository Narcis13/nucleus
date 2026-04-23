class CreateConversations < ActiveRecord::Migration[8.1]
  def change
    create_table :conversations, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :professional, null: false, foreign_key: true, type: :uuid
      t.references :client,       null: false, foreign_key: true, type: :uuid

      t.timestamps
    end

    add_index :conversations, [ :professional_id, :client_id ], unique: true
  end
end
