module Tags
  class Create < ApplicationService
    def initialize(attrs:, actor:, organization:)
      @attrs = attrs.to_h
      @actor = actor
      @organization = organization
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?

      tag = Tag.new(@attrs)
      tag.organization = @organization
      return failure(:invalid, errors: tag.errors, tag: tag) unless tag.save

      success(tag: tag)
    end
  end
end
