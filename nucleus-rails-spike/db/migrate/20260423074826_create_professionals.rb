class CreateProfessionals < ActiveRecord::Migration[8.1]
  def change
    enable_extension "pgcrypto" unless extension_enabled?("pgcrypto")

    create_table :professionals, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :clerk_user_id, null: false
      t.string :email
      t.string :full_name
      t.timestamps
    end

    add_index :professionals, :clerk_user_id, unique: true
  end
end
