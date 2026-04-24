class Rs6LeadsPipeline < ActiveRecord::Migration[8.1]
  # Rs6: the leads pipeline — customizable stages, lead cards, and an append-
  # only activity log. All three tables live under the same Rs3 org-scoped
  # tenancy + RLS pattern established for clients/tags in Rs5.
  #
  #   lead_stages      — per-org Kanban columns. `position` orders them;
  #                      `is_won` / `is_lost` flag the terminal columns so
  #                      Leads::Convert / MarkLost can find them without a
  #                      name match.
  #   leads            — pipeline card. `stage_id` pins the column, optional
  #                      `converted_client_id` points at the client we created
  #                      when the lead is won.
  #   lead_activities  — reverse-chrono timeline. Every note/email/stage-
  #                      change/conversion appends here. Delegates isolation
  #                      to parent lead's RLS policy — same shape as
  #                      client_tags in Rs5.

  def up
    safety_assured do
      create_table :lead_stages, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :organization, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.string  :name, null: false
        t.integer :position, null: false
        t.string  :color, null: false, default: "#6366f1"
        t.boolean :is_default, null: false, default: false
        t.boolean :is_won, null: false, default: false
        t.boolean :is_lost, null: false, default: false
        t.timestamps
      end
      add_index :lead_stages, %i[organization_id position]

      create_table :leads, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :organization, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.references :stage, type: :uuid, null: false,
                     foreign_key: { to_table: :lead_stages, on_delete: :restrict }
        t.references :converted_client, type: :uuid, null: true,
                     foreign_key: { to_table: :clients, on_delete: :nullify }
        t.string  :full_name, null: false
        t.string  :email
        t.string  :phone
        t.string  :source
        t.integer :score, null: false, default: 0
        t.text    :notes
        t.jsonb   :metadata
        t.timestamps
      end
      add_index :leads, %i[organization_id created_at]
      # `t.references :stage` already auto-indexes stage_id.

      # activity_type (not "type") to avoid Rails' STI inheritance_column
      # default — subclasses by string would be surprising for an event log.
      create_table :lead_activities, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
        t.references :lead, type: :uuid, null: false, foreign_key: { on_delete: :cascade }
        t.string :activity_type, null: false
        t.text   :description
        t.jsonb  :metadata
        t.datetime :created_at, null: false
      end
      add_index :lead_activities, %i[lead_id created_at]

      # RLS. Same pattern as Rs5: USING + WITH CHECK on the org GUC, fail-
      # closed via NULLIF(..., '')::uuid so an unset GUC blocks all rows.
      execute <<~SQL
        ALTER TABLE lead_stages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lead_stages FORCE ROW LEVEL SECURITY;
        CREATE POLICY lead_stages_tenant_isolation ON lead_stages
          USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
          WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);

        ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
        ALTER TABLE leads FORCE ROW LEVEL SECURITY;
        CREATE POLICY leads_tenant_isolation ON leads
          USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
          WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);

        -- lead_activities carries no organization_id; delegate to parent lead.
        -- Either side invisible → EXISTS fails → no cross-org reads or writes.
        ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lead_activities FORCE ROW LEVEL SECURITY;
        CREATE POLICY lead_activities_tenant_isolation ON lead_activities
          USING (
            EXISTS (
              SELECT 1 FROM leads l
              WHERE l.id = lead_activities.lead_id
              AND l.organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM leads l
              WHERE l.id = lead_activities.lead_id
              AND l.organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
            )
          );
      SQL
    end
  end

  def down
    safety_assured do
      execute <<~SQL
        DROP POLICY IF EXISTS lead_activities_tenant_isolation ON lead_activities;
        ALTER TABLE lead_activities NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE lead_activities DISABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS leads_tenant_isolation ON leads;
        ALTER TABLE leads NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS lead_stages_tenant_isolation ON lead_stages;
        ALTER TABLE lead_stages NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE lead_stages DISABLE ROW LEVEL SECURITY;
      SQL

      drop_table :lead_activities
      drop_table :leads
      drop_table :lead_stages
    end
  end
end
