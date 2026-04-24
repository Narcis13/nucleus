module LeadStages
  class Reorder < ApplicationService
    # Accepts the post-drop order from the Sortable.js handler and rewrites
    # the `position` integer in one transaction. Input is `ordered_ids`
    # (the id list after drop) OR `ordered` ([{id, position}, ...]); the
    # controller can send whichever shape is easier, and both converge on
    # dense, zero-based positions here.
    #
    # Two-phase write: we first push every touched row into a "parking"
    # range (current max + 1000) so the (organization_id, position) pairs
    # don't collide against any future unique index we might add later.
    # Today there's no such constraint, but the pattern keeps the option
    # open without a rework.

    def initialize(organization:, ordered_ids: nil, ordered: nil, actor: nil)
      @organization = organization
      @actor = actor
      @ordered_ids = Array(ordered_ids).map(&:to_s)
      @ordered_pairs = Array(ordered).map { |h| h.to_h.with_indifferent_access.slice(:id, :position) }
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?

      pairs = resolved_pairs
      return failure(:invalid, message: "No stage positions provided") if pairs.empty?

      ids = pairs.map { |p| p[:id] }
      scope = LeadStage.where(organization_id: @organization.id, id: ids)
      return failure(:not_found, message: "Stage not found") if scope.count != ids.size

      LeadStage.transaction do
        # Park current positions out of range so we can re-sequence without
        # transient duplicates even if a later unique constraint lands.
        offset = (scope.maximum(:position) || 0) + 1000
        scope.find_each do |stage|
          stage.update_column(:position, stage.position + offset)
        end
        pairs.each do |pair|
          LeadStage.where(id: pair[:id]).update_all(position: pair[:position])
        end
      end

      success(stages: LeadStage.where(organization_id: @organization.id).ordered.to_a)
    end

    private

    def resolved_pairs
      if @ordered_pairs.any?
        @ordered_pairs.map { |p| { id: p[:id].to_s, position: p[:position].to_i } }
      else
        @ordered_ids.each_with_index.map { |id, idx| { id: id, position: idx } }
      end
    end
  end
end
