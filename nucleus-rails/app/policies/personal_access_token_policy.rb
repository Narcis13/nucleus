class PersonalAccessTokenPolicy < ApplicationPolicy
  # A PAT belongs to exactly one professional. Only that professional can
  # see it, issue new ones, or revoke it. Org admins don't get to view peers'
  # tokens — that's the whole point of "personal".

  def index? = user.present?
  def new? = user.present?
  def create? = user.present?

  def show?   = owned?
  def revoke? = owned?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if user.nil?
      scope.where(professional_id: user.id, organization_id: Current.organization&.id)
    end
  end

  private

  def owned?
    return false unless user && record
    record.professional_id == user.id && record.organization_id == Current.organization&.id
  end
end
