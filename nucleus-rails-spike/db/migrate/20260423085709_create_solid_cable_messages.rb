class CreateSolidCableMessages < ActiveRecord::Migration[8.1]
  # Hosts the Solid Cable adapter's pub/sub queue in the primary DB for
  # dev. Schema copied from db/cable_schema.rb (which production uses via
  # the separate `cable` database). One DB in dev keeps Supabase simple.
  def change
    create_table :solid_cable_messages do |t|
      t.binary  :channel,      limit: 1024,       null: false
      t.binary  :payload,      limit: 536_870_912, null: false
      t.datetime :created_at,                     null: false
      t.integer :channel_hash, limit: 8,          null: false

      t.index :channel
      t.index :channel_hash
      t.index :created_at
    end
  end
end
