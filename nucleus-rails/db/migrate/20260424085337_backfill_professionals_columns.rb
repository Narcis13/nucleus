class BackfillProfessionalsColumns < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  # The shared Supabase dev DB was first populated by the spike's
  # 20260423074826_create_professionals (id, clerk_user_id, email, full_name),
  # so when nucleus-rails' 20260424063516_create_professionals later tried to
  # CREATE the same table the statement was a no-op yet the version got
  # recorded. This adds the columns the later migration intended.
  def change
    unless column_exists?(:professionals, :clerk_org_id)
      add_column :professionals, :clerk_org_id, :string
      add_index :professionals, :clerk_org_id, algorithm: :concurrently
    end

    unless column_exists?(:professionals, :role)
      add_column :professionals, :role, :string, null: false, default: "owner"
    end
  end
end
