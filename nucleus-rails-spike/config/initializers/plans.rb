module Plans
  CONFIG = {
    "starter" => { stripe_price_id: ENV["STRIPE_STARTER_PRICE"], max_clients: 15,  label: "Starter" },
    "growth"  => { stripe_price_id: ENV["STRIPE_GROWTH_PRICE"],  max_clients: 50,  label: "Growth"  },
    "pro"     => { stripe_price_id: ENV["STRIPE_PRO_PRICE"],     max_clients: 150, label: "Pro"     }
  }.freeze

  module_function

  def all
    CONFIG
  end

  def ids
    CONFIG.keys
  end

  def price_id_for(plan_id)
    CONFIG.dig(plan_id, :stripe_price_id)
  end

  def limit_for(plan_id, key)
    CONFIG.dig(plan_id, key)
  end

  def label_for(plan_id)
    CONFIG.dig(plan_id, :label) || plan_id.to_s.humanize
  end

  def id_for_stripe_price(price_id)
    CONFIG.find { |_, cfg| cfg[:stripe_price_id] == price_id }&.first
  end
end
