require "csv"

module Clients
  class Import < ApplicationService
    # CSV import in two modes, same call site:
    #   * dry_run: true   — parse + validate every row, return a per-row
    #                       report. Populates the preview screen. No writes.
    #   * dry_run: false  — commit the rows that validated. Invalid rows are
    #                       skipped; the result reports them for the operator.
    #
    # Streaming via CSV.foreach on a tempfile (not the full read buffer) so a
    # 10k-row file doesn't balloon memory. Verification target (plan):
    # "Import 1,000-row CSV in <10 seconds with per-row validation."
    #
    # Committed writes use insert_all for a single round trip when possible.
    # We still instantiate Client.new per row for validation so the error
    # surface is the same ActiveModel::Errors shape the rest of the app uses.

    ALLOWED_HEADERS = %w[full_name email phone status source notes].freeze

    Row = Struct.new(:index, :raw, :attrs, :errors, keyword_init: true) do
      def valid? = errors.blank?
    end

    def initialize(io:, organization:, actor:, dry_run: true)
      @io = io
      @organization = organization
      @actor = actor
      @dry_run = dry_run
    end

    def call
      return failure(:unauthenticated, message: "Tenant context required") if @organization.nil?
      return failure(:invalid, message: "No file uploaded") if @io.nil?

      path = tempfile_path
      return failure(:invalid, message: "Unreadable upload") if path.nil?

      rows = []
      CSV.foreach(path, headers: true, header_converters: :downcase) do |csv_row|
        rows << parse_row(rows.size + 1, csv_row)
      end

      valid_rows = rows.select(&:valid?)
      if @dry_run
        return success(rows: rows, valid_count: valid_rows.size, invalid_count: rows.size - valid_rows.size, committed: false)
      end

      created = commit!(valid_rows)
      success(
        rows: rows,
        valid_count: valid_rows.size,
        invalid_count: rows.size - valid_rows.size,
        created_count: created,
        committed: true
      )
    end

    private

    def tempfile_path
      return @io.path if @io.respond_to?(:path) && @io.path
      return @io.to_s if File.exist?(@io.to_s)
      nil
    end

    def parse_row(index, csv_row)
      raw = csv_row.to_h
      attrs = raw.slice(*ALLOWED_HEADERS).transform_keys(&:to_s)
      attrs["status"] = attrs["status"].presence || "lead"

      # Build a throwaway record to reuse model validations; this is the
      # canonical definition of "valid row" so the preview screen and the
      # commit can't disagree about what's acceptable.
      client = Client.new(attrs)
      client.organization = @organization
      errors = client.valid? ? nil : client.errors.to_hash

      Row.new(index: index, raw: raw, attrs: attrs, errors: errors)
    end

    def commit!(rows)
      return 0 if rows.empty?

      # insert_all skips model callbacks — Auditable wouldn't fire, which is
      # a gap the plan doesn't force us to close right now (the CSV import
      # is a bulk event; we audit the batch below instead of per row). If
      # per-row audit becomes a requirement, switch back to .create! in a
      # transaction.
      now = Time.current
      records = rows.map do |row|
        row.attrs.merge(
          "organization_id" => @organization.id,
          "created_at" => now,
          "updated_at" => now
        )
      end

      inserted = 0
      ActiveRecord::Base.transaction do
        result = Client.insert_all(records, returning: [ :id ])
        inserted = result.rows.size
        write_batch_audit!(inserted)
      end
      inserted
    end

    def write_batch_audit!(count)
      AuditLog.create!(
        organization: @organization,
        actor_id: @actor&.id,
        actor_type: @actor ? "Professional" : nil,
        action: "import",
        auditable_type: "Client",
        auditable_id: @organization.id, # there is no single record — pin to org
        audited_changes: { "count" => [ 0, count ] },
        ip_address: Current.request_meta[:ip],
        user_agent: Current.request_meta[:user_agent]
      )
    end
  end
end
