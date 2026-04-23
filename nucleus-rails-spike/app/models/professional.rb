class Professional < ApplicationRecord
  validates :clerk_user_id, presence: true, uniqueness: true

  def self.upsert_from_clerk!(clerk_user)
    find_or_initialize_by(clerk_user_id: clerk_user.id).tap do |p|
      p.email = clerk_user.email_addresses&.first&.email_address
      p.full_name = [clerk_user.first_name, clerk_user.last_name].compact.join(" ").presence
      p.save!
    end
  end
end
