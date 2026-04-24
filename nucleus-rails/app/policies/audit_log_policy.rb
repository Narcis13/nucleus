class AuditLogPolicy < ApplicationPolicy
  def index?
    # Owners see the org trail; members and clients do not. RLS still pins
    # the result set to the active organization regardless of this answer.
    Current.organization_membership&.owner? == true
  end

  def show?
    index? && record.organization_id == Current.organization&.id
  end

  # Audit rows are append-only. Callbacks in Auditable are the only writers.
  def create?  = false
  def update?  = false
  def destroy? = false

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if user.nil? || Current.organization.nil?
      return scope.none unless Current.organization_membership&.owner?
      scope.where(organization_id: Current.organization.id)
    end
  end
end
