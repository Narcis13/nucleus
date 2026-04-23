class CreateMessages < ActiveRecord::Migration[8.1]
  # professional_id is denormalized from conversation for RLS: the
  # policy compares per-row, so every tenant table needs the tenant
  # column locally. We sync it in a model callback before_validation.
  def change
    create_table :messages, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :conversation,  null: false, foreign_key: true, type: :uuid
      t.references :professional,  null: false, foreign_key: true, type: :uuid
      t.string  :sender_clerk_id,  null: false
      t.text    :body,             null: false

      t.timestamps
    end

    add_index :messages, [ :conversation_id, :created_at ]
  end
end
