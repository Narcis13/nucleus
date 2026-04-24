class OrganizationPolicy < ApplicationPolicy
  def show?
    acting_member_of_record?
  end

  def update?
    acting_owner_of_record?
  end

  def destroy?
    # Orgs are owned by Clerk's lifecycle; destruction flows through the
    # webhook, not the UI. No role can delete via this policy.
    false
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if user.nil?
      # With RLS active, app.organization_id pins the visible row. Without
      # an active org, nothing is scoped in.
      Current.organization ? scope.where(id: Current.organization.id) : scope.none
    end
  end

  private

  def acting_member_of_record?
    Current.organization_membership&.organization_id == record.id
  end

  def acting_owner_of_record?
    acting_member_of_record? && Current.organization_membership.owner?
  end
end
