class LeadStagePolicy < ApplicationPolicy
  # Same shape as LeadPolicy. Stage CRUD is gated on org membership, not on
  # a separate role — Rs7 can narrow to owners-only in one place if ops
  # asks.

  def index?   = authorized_member?
  def show?    = authorized_member? && record_in_org?
  def create?  = authorized_member?
  def update?  = authorized_member? && record_in_org?
  def destroy? = authorized_member? && record_in_org?
  def reorder? = authorized_member?

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
