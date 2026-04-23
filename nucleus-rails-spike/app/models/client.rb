class Client < ApplicationRecord
  acts_as_tenant :professional

  validates :full_name, presence: true
end
