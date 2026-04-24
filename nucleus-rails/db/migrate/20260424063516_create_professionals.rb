class CreateProfessionals < ActiveRecord::Migration[8.1]
  def change
    create_table :professionals, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.string :clerk_user_id, null: false
      t.string :clerk_org_id
      t.string :email
      t.string :full_name
      t.string :role, null: false, default: "owner"
      t.timestamps
    end

    add_index :professionals, :clerk_user_id, unique: true
    add_index :professionals, :clerk_org_id
  end
end
