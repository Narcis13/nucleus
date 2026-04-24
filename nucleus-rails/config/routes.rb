Rails.application.routes.draw do
  # ViewComponent development UI. Dev-only — the lookbook gem itself is in
  # the :development bundle group, so this constant is absent in prod/test.
  mount Lookbook::Engine, at: "/lookbook" if Rails.env.development?

  get "sign-in", to: "sessions#new", as: :sign_in
  delete "sign-out", to: "sessions#destroy", as: :sign_out

  get "dashboard", to: "dashboard#index", as: :dashboard

  namespace :webhooks do
    post "clerk", to: "clerk#create"
  end

  # /api/v1 is token-only (Api::TokenAuth). No cookies, no CSRF — the base
  # controller inherits from ActionController::API, so session middleware
  # never runs for these paths. Rs4.5 lands /me; Rs5+ bolt on resource
  # routes as each session ships.
  namespace :api do
    namespace :v1 do
      get "me", to: "me#show"
    end
  end

  # Dashboard-only: issue / revoke PATs. The plaintext is shown exactly
  # once on create. Revoke is POST (not DELETE) so browsers without
  # turbo-method handling still work.
  namespace :settings do
    resources :personal_access_tokens, only: %i[index new create] do
      member { post :revoke }
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  root to: "dashboard#index"
end
