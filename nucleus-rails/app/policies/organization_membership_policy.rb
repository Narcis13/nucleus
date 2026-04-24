class OrganizationMembershipPolicy < ApplicationPolicy
  def show?
    acting_in_same_org? && (owner_in_org? || record.professional_id == user&.id)
  end

  def create?
    owner_in_org?
  end

  def update?
    owner_in_org? && !acting_on_self?
  end

  def destroy?
    owner_in_org? && !acting_on_self?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if user.nil?
      org = Current.organization
      return scope.none if org.nil?

      if Current.organization_membership&.owner?
        scope.where(organization_id: org.id)
      else
        scope.where(organization_id: org.id, professional_id: user.id)
      end
    end
  end

  private

  def acting_in_same_org?
    Current.organization_membership&.organization_id == record.organization_id
  end

  def owner_in_org?
    acting_in_same_org? && Current.organization_membership.owner?
  end

  def acting_on_self?
    record.professional_id == user&.id
  end
end
