module PolicyHelpers
  # Sets Current.* for the duration of an example, since policies read from
  # Current rather than arguments.
  def as_current(professional:, organization: nil, membership: nil)
    Current.professional = professional
    Current.organization = organization
    Current.organization_membership = membership
    yield
  ensure
    Current.reset
  end
end

RSpec.configure do |c|
  c.include PolicyHelpers, type: :policy
  c.include PolicyHelpers
end

# Shared matchers so each policy spec doesn't redefine them.
RSpec::Matchers.define :permit_actions do |actions|
  match do |policy|
    actions.all? { |a| policy.public_send("#{a}?") == true }
  end
  failure_message do |policy|
    "expected policy to permit #{actions}, got: " +
      actions.map { |a| [ a, policy.public_send("#{a}?") ] }.to_h.inspect
  end
end

RSpec::Matchers.define :forbid_actions do |actions|
  match do |policy|
    actions.all? { |a| !policy.public_send("#{a}?") }
  end
  failure_message do |policy|
    "expected policy to forbid #{actions}, got: " +
      actions.map { |a| [ a, policy.public_send("#{a}?") ] }.to_h.inspect
  end
end
