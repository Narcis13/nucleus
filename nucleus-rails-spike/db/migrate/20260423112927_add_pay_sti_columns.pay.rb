# This migration comes from pay (originally 2)
class AddPayStiColumns < ActiveRecord::Migration[6.0]
  def change
    # Pay ships this migration in a single file; the rename_column targets a
    # pay_payment_methods column that was just created by the preceding Pay
    # install migration and has zero rows at this point. Safe to rename here.
    safety_assured do
      apply_changes
    end
  end

  def apply_changes
    add_column :pay_customers, :type, :string
    add_column :pay_charges, :type, :string
    add_column :pay_subscriptions, :type, :string

    rename_column :pay_payment_methods, :type, :payment_method_type
    add_column :pay_payment_methods, :type, :string

    add_column :pay_merchants, :type, :string

    Pay::Customer.find_each do |pay_customer|
      pay_customer.update(type: "Pay::#{pay_customer.processor.classify}::Customer")

      pay_customer.charges.update_all(type: "Pay::#{pay_customer.processor.classify}::Charge")
      pay_customer.subscriptions.update_all(type: "Pay::#{pay_customer.processor.classify}::Subscription")
      pay_customer.payment_methods.update_all(type: "Pay::#{pay_customer.processor.classify}::PaymentMethod")
    end

    Pay::Merchant.find_each do |pay_merchant|
      pay_merchant.update(type: "Pay::#{pay_merchant.processor.classify}::Merchant")
    end
  end
end
