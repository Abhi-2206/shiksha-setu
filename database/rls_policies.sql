-- ============================================================================
-- Shiksha Setu — PostgreSQL Row-Level Security (RLS) Reference Policies
-- Optional defense-in-depth script for PostgreSQL deployments using session context
-- ============================================================================

-- Enable RLS on user-specific tables
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "College" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CollegeCutoff" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Helper Functions for Session Context
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS INTEGER AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_role', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- StudentProfile RLS Policies
-- Students can only select and update their own profile; admins have full access
-- ----------------------------------------------------------------------------
CREATE POLICY student_profile_select_policy ON "StudentProfile"
  FOR SELECT
  USING (
    "userId" = current_app_user_id()
    OR current_app_user_role() = 'ADMIN'
  );

CREATE POLICY student_profile_modify_policy ON "StudentProfile"
  FOR ALL
  USING (
    "userId" = current_app_user_id()
    OR current_app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "userId" = current_app_user_id()
    OR current_app_user_role() = 'ADMIN'
  );

-- ----------------------------------------------------------------------------
-- ChatSession & ChatMessage RLS Policies
-- Students can only access chat sessions and messages they own
-- ----------------------------------------------------------------------------
CREATE POLICY chat_session_isolation_policy ON "ChatSession"
  FOR ALL
  USING (
    "userId" = current_app_user_id()
    OR current_app_user_role() = 'ADMIN'
  )
  WITH CHECK (
    "userId" = current_app_user_id()
    OR current_app_user_role() = 'ADMIN'
  );

CREATE POLICY chat_message_isolation_policy ON "ChatMessage"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "ChatSession"
      WHERE "ChatSession"."id" = "ChatMessage"."sessionId"
        AND ("ChatSession"."userId" = current_app_user_id() OR current_app_user_role() = 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ChatSession"
      WHERE "ChatSession"."id" = "ChatMessage"."sessionId"
        AND ("ChatSession"."userId" = current_app_user_id() OR current_app_user_role() = 'ADMIN')
    )
  );

-- ----------------------------------------------------------------------------
-- College & CollegeCutoff RLS Policies
-- Public / students can SELECT; only ADMIN can INSERT, UPDATE, or DELETE
-- ----------------------------------------------------------------------------
CREATE POLICY college_read_policy ON "College"
  FOR SELECT
  USING (true);

CREATE POLICY college_admin_modify_policy ON "College"
  FOR ALL
  USING (current_app_user_role() = 'ADMIN')
  WITH CHECK (current_app_user_role() = 'ADMIN');

CREATE POLICY cutoff_read_policy ON "CollegeCutoff"
  FOR SELECT
  USING (true);

CREATE POLICY cutoff_admin_modify_policy ON "CollegeCutoff"
  FOR ALL
  USING (current_app_user_role() = 'ADMIN')
  WITH CHECK (current_app_user_role() = 'ADMIN');
