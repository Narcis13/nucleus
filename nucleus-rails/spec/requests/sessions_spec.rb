require "rails_helper"

RSpec.describe "Sessions & Dashboard", type: :request do
  describe "GET /sign-in" do
    it "renders when unauthenticated" do
      get "/sign-in"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Sign in")
    end

    it "redirects to /dashboard when signed in" do
      pro = create(:professional)
      sign_in_as(pro)
      get "/sign-in"
      expect(response).to redirect_to(dashboard_path)
    end
  end

  describe "GET /dashboard" do
    it "redirects unauthenticated users to /sign-in" do
      get "/dashboard"
      expect(response).to redirect_to(sign_in_path)
    end

    it "renders for signed-in users" do
      pro = create(:professional, email: "ada@example.com")
      sign_in_as(pro)
      get "/dashboard"
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("ada@example.com")
    end
  end

  describe "DELETE /sign-out" do
    it "clears the session and redirects to sign-in" do
      pro = create(:professional)
      sign_in_as(pro)
      delete "/sign-out"
      expect(response).to redirect_to(sign_in_path)
    end
  end
end
