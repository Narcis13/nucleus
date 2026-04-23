Rails.application.routes.draw do
  resources :notes
  resources :clients, only: [ :index, :new, :create, :show ]
  resources :conversations, only: [ :index, :show, :create ] do
    resources :messages, only: [ :create ]
  end

  get "sign-in", to: "sessions#new", as: :sign_in
  get "dashboard", to: "dashboard#index", as: :dashboard

  get  "billing",          to: "billings#show",     as: :billing
  get  "billing/upgrade",  to: "billings#upgrade",  as: :billing_upgrade
  post "billing/checkout", to: "billings#checkout", as: :billing_checkout
  post "billing/portal",   to: "billings#portal",   as: :billing_portal

  # Pay auto-mounts its engine at /pay (see Pay.automount_routes). The Stripe
  # webhook lands at /pay/webhooks/stripe with signature verification handled
  # by Pay internally.

  namespace :webhooks do
    post "clerk", to: "clerk#create"
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  root to: "dashboard#index"
end
