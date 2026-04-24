class ProfessionalPolicy < ApplicationPolicy
  def show?
    self_record? || membership_gate(:any)
  end

  def update?
    self_record? || membership_gate(:owner)
  end

  def destroy?
    # Org owners can remove org peers, but no one removes themselves this way
    # (Clerk owns deprovisioning; the user.deleted webhook clears the row).
    acting_membership&.owner? && record != user && record_in_same_org?
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none if user.nil?
      org = Current.organization
      return scope.where(id: user.id) if org.nil?

      case Current.organization_membership&.role
      when "owner", "member"
        peer_ids = OrganizationMembership.where(organization_id: org.id).select(:professional_id)
        scope.where(id: peer_ids)
      else
        scope.where(id: user.id)
      end
    end
  end

  private

  def self_record?
    user && record == user
  end

  # Returns true if the acting user holds a membership in the same
  # organization as +record+, matching the requested +level+ (:any, :owner,
  # :member). Source of truth is OrganizationMembership; we look up the
  # record's memberships live rather than trusting a denormalized column.
  def membership_gate(level)
    return false unless user && Current.organization

    acting = acting_membership
    return false unless acting
    return false unless record_in_same_org?

    case level
    when :any    then %w[owner member].include?(acting.role)
    when :owner  then acting.owner?
    when :member then acting.member?
    else false
    end
  end

  def acting_membership
    Current.organization_membership
  end

  def record_in_same_org?
    return false unless Current.organization
    OrganizationMembership.exists?(
      organization_id: Current.organization.id,
      professional_id: record.id
    )
  end
end
