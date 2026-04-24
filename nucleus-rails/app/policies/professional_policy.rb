class ProfessionalPolicy < ApplicationPolicy
  def show?
    owner_or_self? || member_same_org?
  end

  def update?
    owner_or_self?
  end

  def destroy?
    user&.owner? && record == user
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if user.nil?
      return scope.where(clerk_org_id: user.clerk_org_id) if user.owner? || user.member?
      scope.where(id: user.id)
    end
  end

  private

  def owner_or_self?
    user && (user.owner? || record == user)
  end

  def member_same_org?
    user&.member? && user.clerk_org_id.present? && user.clerk_org_id == record.clerk_org_id
  end
end
