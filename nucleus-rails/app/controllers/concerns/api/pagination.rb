module Api
  module Pagination
    # Standard pagination for /api/v1 list endpoints. Pagy drives the cursor;
    # we surface page state via RFC 5988 Link headers and an X-Total-Count
    # header so clients that don't parse Link still know the size.
    #
    # Usage in a subclass:
    #
    #   def index
    #     pagy, clients = pagy(Client.order(:created_at))
    #     set_pagination_headers(pagy)
    #     render json: Api::V1::ClientResource.new(clients).serializable_hash
    #   end

    def set_pagination_headers(pagy)
      response.set_header("X-Total-Count", pagy.count.to_s)
      response.set_header("X-Page", pagy.page.to_s)
      response.set_header("X-Per-Page", pagy.limit.to_s)

      links = build_link_header(pagy)
      response.set_header("Link", links) if links.present?
    end

    private

    def build_link_header(pagy)
      base = request.url.split("?").first
      params_without_page = request.query_parameters.except("page")

      links = {}
      links[:first] = build_link(base, params_without_page, 1)
      links[:last]  = build_link(base, params_without_page, pagy.pages)
      links[:prev]  = build_link(base, params_without_page, pagy.prev) if pagy.prev
      links[:next]  = build_link(base, params_without_page, pagy.next) if pagy.next

      links.map { |rel, url| %(<#{url}>; rel="#{rel}") }.join(", ")
    end

    def build_link(base, params, page)
      qs = params.merge(page: page).to_query
      "#{base}?#{qs}"
    end
  end
end
