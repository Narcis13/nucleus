module Clients
  class ImportsController < ApplicationController
    layout "dashboard"

    before_action :require_clerk_user!
    before_action :require_active_organization!

    # Two-step flow: `create` runs the dry-run and caches the uploaded file;
    # `commit` re-reads it and performs the insert. Caching the file lets the
    # operator eyeball the preview before committing — the Result from the
    # dry-run never touches the DB.
    def new
      authorize Client, :import?
    end

    def create
      authorize Client, :import?
      io = params[:file]
      return redirect_to(import_new_clients_path, alert: "Choose a CSV file.") if io.blank?

      # Cache the raw upload on disk for the commit step. tempfile is cleaned
      # up automatically when the Ruby object is garbage collected, which
      # is fine because we only need it until the redirect.
      cache_key = "clients/import/#{Current.professional.id}/#{SecureRandom.hex(8)}"
      Rails.cache.write(cache_key, File.read(io.path), expires_in: 15.minutes)

      result = Clients::Import.call(
        io: io, organization: Current.organization, actor: Current.professional, dry_run: true
      )

      if result.success?
        session[:clients_import_key] = cache_key
        @report = result
        render :preview
      else
        flash.now[:alert] = result.message || "Could not parse file."
        render :new, status: :unprocessable_content
      end
    end

    def commit
      authorize Client, :import?
      cache_key = session[:clients_import_key]
      payload = cache_key && Rails.cache.read(cache_key)
      if payload.nil?
        return redirect_to(import_new_clients_path, alert: "Upload expired — try again.")
      end

      tmp = Tempfile.new([ "import", ".csv" ])
      tmp.binmode
      tmp.write(payload)
      tmp.rewind

      result = Clients::Import.call(
        io: tmp, organization: Current.organization, actor: Current.professional, dry_run: false
      )

      Rails.cache.delete(cache_key)
      session.delete(:clients_import_key)

      if result.success?
        redirect_to clients_path, notice: "Imported #{result.created_count} clients."
      else
        flash.now[:alert] = result.message || "Could not import."
        render :new, status: :unprocessable_content
      end
    ensure
      tmp&.close
      tmp&.unlink
    end

    private

    def require_active_organization!
      return if Current.organization.present?
      redirect_to dashboard_path, alert: "Join or create an organization first."
    end
  end
end
