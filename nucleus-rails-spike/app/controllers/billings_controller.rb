class BillingsController < ApplicationController
  before_action :require_clerk_user!
  before_action :ensure_stripe_processor

  def show
    @plan_id      = current_professional.current_plan
    @subscription = current_professional.payment_processor&.subscription
    @client_count = current_professional.clients.count
    @max_clients  = Plans.limit_for(@plan_id, :max_clients)
  end

  def upgrade
    render :upgrade
  end

  def checkout
    plan_id  = params.require(:plan)
    price_id = Plans.price_id_for(plan_id)
    redirect_to billing_path, alert: "Unknown plan." and return unless price_id

    session = current_professional.payment_processor.checkout(
      mode: "subscription",
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: billing_url,
      cancel_url:  billing_url
    )
    redirect_to session.url, allow_other_host: true, status: :see_other
  end

  def portal
    session = current_professional.payment_processor.billing_portal(
      return_url: billing_url
    )
    redirect_to session.url, allow_other_host: true, status: :see_other
  end

  private

  def ensure_stripe_processor
    unless current_professional.payment_processor&.processor == "stripe"
      current_professional.set_payment_processor :stripe
    end
  end
end
