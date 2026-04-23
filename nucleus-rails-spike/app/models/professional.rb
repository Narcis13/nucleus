class Professional < ApplicationRecord
  pay_customer stripe_attributes: :stripe_attributes

  validates :clerk_user_id, presence: true, uniqueness: true

  def current_plan
    sub = payment_processor&.subscription
    return "free" unless sub&.active?
    Plans.id_for_stripe_price(sub.processor_plan) || "free"
  end

  def subscribed_and_within_quota?(resource_key)
    return false unless payment_processor&.subscription&.active?
    limit = Plans.limit_for(current_plan, resource_key)
    return true if limit.nil?
    usage_for(resource_key) < limit
  end

  def usage_for(resource_key)
    case resource_key
    when :max_clients then clients.count
    else 0
    end
  end

  has_many :clients, dependent: :destroy

  private

  def stripe_attributes(pay_customer)
    {
      email: pay_customer.owner.email,
      name:  pay_customer.owner.full_name,
      metadata: { professional_id: pay_customer.owner.id }
    }
  end

  def self.upsert_from_clerk!(clerk_user)
    find_or_initialize_by(clerk_user_id: clerk_user.id).tap do |p|
      p.email = clerk_user.email_addresses&.first&.email_address
      p.full_name = [clerk_user.first_name, clerk_user.last_name].compact.join(" ").presence
      p.save!
    end
  end
end
