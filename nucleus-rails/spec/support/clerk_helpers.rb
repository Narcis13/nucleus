module ClerkHelpers
  # Minimal stand-in for the Clerk::Proxy the Rack middleware installs
  # on real requests. Only implements the methods our app code reads.
  FakeClerkUser = Struct.new(:id, :first_name, :last_name, :email_addresses, keyword_init: true)
  FakeEmail = Struct.new(:email_address)

  class FakeProxy
    def initialize(user)
      @user = user
    end

    def user? = !@user.nil?
    def user = @user
    def user_id = @user&.id
  end

  def sign_in_as(professional)
    user = FakeClerkUser.new(
      id: professional.clerk_user_id,
      first_name: professional.full_name.to_s.split(" ").first,
      last_name: professional.full_name.to_s.split(" ")[1..]&.join(" "),
      email_addresses: [ FakeEmail.new(professional.email) ]
    )
    proxy = FakeProxy.new(user)
    allow_any_instance_of(ApplicationController).to receive(:clerk_proxy).and_return(proxy)
  end
end

RSpec.configure do |c|
  c.include ClerkHelpers, type: :request
end
