class DashboardPolicy < Struct.new(:user, :dashboard)
  # Pundit header policy for a non-record authorization. Any authenticated
  # professional can see the dashboard shell; per-section visibility is
  # enforced by the policies of the resources rendered inside it.
  def show?
    user.present?
  end
end
