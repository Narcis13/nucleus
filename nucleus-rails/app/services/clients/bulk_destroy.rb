module Clients
  class BulkDestroy < ApplicationService
    # Batch-delete endpoint used by the list view's bulk-actions toolbar.
    # Verification target (plan): "Bulk delete 50 clients in one request,
    # audit log captures all 50."
    #
    # We iterate rather than .delete_all because Auditable hangs callbacks off
    # after_commit :destroy — a batch DELETE skips AR callbacks and would
    # skip the audit trail, which is the non-negotiable bit. For 50-row
    # deletes the per-row cost is dwarfed by the round trip, and we wrap the
    # whole set in one transaction so a mid-iteration failure rolls back the
    # partial audit rows too.

    def initialize(scope:, ids:, actor:)
      @scope = scope
      @ids   = Array(ids).map(&:to_s).reject(&:blank?).uniq
      @actor = actor
    end

    def call
      return success(destroyed: [], missing: []) if @ids.empty?

      found = @scope.where(id: @ids).to_a
      found_ids = found.map(&:id)
      missing = @ids - found_ids

      destroyed = []
      ActiveRecord::Base.transaction do
        found.each do |client|
          client.destroy!
          destroyed << client.id
        end
      end

      success(destroyed: destroyed, missing: missing)
    end
  end
end
