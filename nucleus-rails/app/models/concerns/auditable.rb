module Auditable
  extend ActiveSupport::Concern

  # Opt-in audit trail. Including this module attaches after_commit callbacks
  # that write one AuditLog row per create/update/destroy, scoped to
  # Current.organization so the trail lives inside the same RLS boundary as
  # the data it describes.
  #
  # "After commit" (not after_save) matters: an audit of an uncommitted row
  # would be a lie. Commit also means the write succeeded, which is the
  # only thing worth auditing.
  #
  # No-op when Current.organization is unset. That covers three realistic
  # paths where we don't want to fabricate an audit row:
  #   * early boot / seeds, where there's no request
  #   * the webhook path *before* we've resolved the org (e.g. creating the
  #     Organization row itself — we audit the subsequent membership)
  #   * internal tooling / Rake tasks
  included do
    after_commit :record_audit_create,  on: :create
    after_commit :record_audit_update,  on: :update
    after_commit :record_audit_destroy, on: :destroy
  end

  private

  def record_audit_create
    write_audit!("create", attributes.transform_values { |v| [ nil, v ] })
  end

  def record_audit_update
    changes = previous_changes.except("updated_at", "created_at")
    return if changes.empty?

    write_audit!("update", changes)
  end

  def record_audit_destroy
    write_audit!("destroy", attributes.transform_values { |v| [ v, nil ] })
  end

  def write_audit!(action, diff)
    org = Current.organization
    return unless org

    meta = Current.request_meta
    AuditLog.create!(
      organization: org,
      actor_id: Current.professional&.id,
      actor_type: Current.professional ? "Professional" : nil,
      action: action,
      auditable_type: self.class.name,
      auditable_id: id,
      audited_changes: diff,
      ip_address: meta[:ip],
      user_agent: meta[:user_agent]
    )
  end
end
