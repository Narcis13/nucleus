class LeadPolicy < ApplicationPolicy
  # Leads live under the same org-membership gate as clients: anyone with a
  # non-client role on the active org can see and write them. RLS + the
  # policy scope are the belt-and-braces; this opt-in gate keeps Pundit's
  # default-deny honest.

  def index?    = authorized_member?
  def show?     = authorized_member? && record_in_org?
  def create?   = authorized_member?
  def update?   = authorized_member? && record_in_org?
  def destroy?  = authorized_member? && record_in_org?
  def move?     = update?
  def convert?  = update?
  def mark_lost? = update?
  def add_activity? = update?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if Current.organization.nil?
      return scope.none if user.nil?
      scope.where(organization_id: Current.organization.id)
    end
  end

  private

  def authorized_member?
    return false if user.nil?
    return false if Current.organization.nil?
    !user.client?
  end

  def record_in_org?
    return false unless record.respond_to?(:organization_id)
    record.organization_id == Current.organization&.id
  end
end
