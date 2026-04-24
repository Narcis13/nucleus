require "alba"

class ApplicationResource
  # Base class for all alba resources. Subclasses live under
  # app/resources/api/v1/ and are named for the resource they serialize
  # (e.g. Api::V1::ClientResource in Rs5, Api::V1::LeadResource in Rs6).
  #
  # Alba's class-level DSL does the actual work; this shim exists so every
  # resource inherits one consistent base — easier to bolt on later
  # cross-cutting concerns (links, error envelopes, HAL if we add it) in
  # one place rather than 40 resource files.

  include Alba::Resource
end
