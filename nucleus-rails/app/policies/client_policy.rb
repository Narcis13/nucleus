class ClientPolicy < ApplicationPolicy
  # Clients are org-shared. Any professional with an active org membership can
  # see and write them; the `client` role (Rs2 — a B2C end user) cannot.
  #
  # Row-level isolation is already enforced by acts_as_tenant + Postgres RLS.
  # The policy adds a consistent authorization gate that 403s cleanly for a
  # visitor with no active org, and keeps Rs7 (role-aware gating) a pure
  # one-file change.

  def index?   = authorized_member?
  def show?    = authorized_member? && record_in_org?
  def create?  = authorized_member?
  def update?  = authorized_member? && record_in_org?
  def destroy? = authorized_member? && record_in_org?

  # Bulk operations share the same gate as destroy. Dedicated action lets a
  # future role split (e.g. members can delete but not bulk-delete) happen
  # without editing every controller.
  def bulk_destroy? = destroy?
  def import?       = authorized_member?
  def export?       = authorized_member?
  def attach_tag?   = update?
  def detach_tag?   = update?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if Current.organization.nil?
      return scope.none if user.nil?
      # acts_as_tenant already scopes on organization_id; we re-assert it so
      # a caller that bypasses default scoping (with ActsAsTenant.without_tenant)
      # still gets filtered results. RLS would catch a mistake at the DB layer
      # but failing closed in Ruby surfaces it as `.none` instead of a 403.
      scope.where(organization_id: Current.organization.id)
    end
  end

  private

  def authorized_member?
    return false if user.nil?
    return false if Current.organization.nil?
    # Rs7 will replace this with a role check on OrganizationMembership.
    # For Rs5 we only exclude the `client` role since they never touch the
    # CRM; owner + member both pass.
    !user.client?
  end

  def record_in_org?
    return false unless record.respond_to?(:organization_id)
    record.organization_id == Current.organization&.id
  end
end
