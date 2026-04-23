Rails.application.routes.draw do
  resources :notes
  resources :clients, only: [ :index, :new, :create, :show ]
  resources :conversations, only: [ :index, :show, :create ] do
    resources :messages, only: [ :create ]
  end

  get "sign-in", to: "sessions#new", as: :sign_in
  get "dashboard", to: "dashboard#index", as: :dashboard

  namespace :webhooks do
    post "clerk", to: "clerk#create"
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  root to: "dashboard#index"
end
