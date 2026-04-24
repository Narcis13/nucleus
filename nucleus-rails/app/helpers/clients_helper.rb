module ClientsHelper
  STATUS_VARIANT = {
    "lead"     => :info,
    "active"   => :success,
    "archived" => :default
  }.freeze

  def status_variant(status)
    STATUS_VARIANT.fetch(status.to_s, :default)
  end
end
