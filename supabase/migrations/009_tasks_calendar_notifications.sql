-- Nexora Fase 10 — Tarefas, Agenda e Notificações
-- Migration: tasks, task_checklists, calendar_events, event_reminders,
--            notifications, notification_preferences, push_subscriptions

-- ============================================================================
-- 1. TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES memberships(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  -- Module linking (nullable FKs — only one should be set per task)
  linked_client_id UUID,
  linked_lead_id UUID,
  linked_order_id UUID,
  linked_supplier_id UUID,
  linked_purchase_order_id UUID,
  linked_invoice_id UUID,
  linked_product_id UUID,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tasks"
  ON tasks FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update tasks"
  ON tasks FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can delete tasks"
  ON tasks FOR DELETE USING (is_member_of(organization_id));

-- ============================================================================
-- 2. TASK_CHECKLISTS (subtasks / checklist items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON task_checklists(task_id);

ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

-- Checklist items inherit access from parent task via join
CREATE POLICY "Members can view task checklists"
  ON task_checklists FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_checklists.task_id AND is_member_of(t.organization_id))
  );

CREATE POLICY "Members can manage task checklists"
  ON task_checklists FOR ALL USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_checklists.task_id AND is_member_of(t.organization_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_checklists.task_id AND is_member_of(t.organization_id))
  );

-- ============================================================================
-- 3. CALENDAR_EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  -- Recurrence (RFC 5545 RRULE subset)
  recurrence_rule TEXT, -- e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z"
  recurrence_end_date TIMESTAMPTZ,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  -- Module linking
  linked_client_id UUID,
  linked_lead_id UUID,
  linked_order_id UUID,
  linked_supplier_id UUID,
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_event_end_after_start CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_dates ON calendar_events(organization_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence ON calendar_events(recurrence_rule) WHERE recurrence_rule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_parent ON calendar_events(parent_event_id) WHERE parent_event_id IS NOT NULL;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view calendar events"
  ON calendar_events FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY "Members can create calendar events"
  ON calendar_events FOR INSERT WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can update calendar events"
  ON calendar_events FOR UPDATE USING (is_member_of(organization_id)) WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Members can delete calendar events"
  ON calendar_events FOR DELETE USING (is_member_of(organization_id));

-- ============================================================================
-- 4. EVENT_ATTENDEES (who is invited/attending)
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'accepted', 'declined', 'tentative')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, membership_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_membership ON event_attendees(membership_id);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view event attendees"
  ON event_attendees FOR SELECT USING (
    EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = event_attendees.event_id AND is_member_of(ce.organization_id))
  );

CREATE POLICY "Members can manage event attendees"
  ON event_attendees FOR ALL USING (
    EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = event_attendees.event_id AND is_member_of(ce.organization_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = event_attendees.event_id AND is_member_of(ce.organization_id))
  );

-- ============================================================================
-- 5. EVENT_REMINDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL DEFAULT 'notification' CHECK (reminder_type IN ('notification', 'email', 'push')),
  minutes_before INT NOT NULL DEFAULT 15,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_pending ON event_reminders(sent_at) WHERE sent_at IS NULL;

ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view event reminders"
  ON event_reminders FOR SELECT USING (
    EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = event_reminders.event_id AND is_member_of(ce.organization_id))
  );

CREATE POLICY "Members can manage event reminders"
  ON event_reminders FOR ALL USING (
    EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = event_reminders.event_id AND is_member_of(ce.organization_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.id = event_reminders.event_id AND is_member_of(ce.organization_id))
  );

-- ============================================================================
-- 6. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'task_assigned', 'task_due_soon', 'task_overdue', 'task_completed',
    'event_reminder', 'event_updated', 'event_cancelled',
    'order_status_changed', 'payment_received', 'payment_overdue',
    'stock_low', 'purchase_received', 'member_joined', 'system'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_all ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE USING (auth.uid() = recipient_id);

-- ============================================================================
-- 7. NOTIFICATION_PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push')),
  category TEXT NOT NULL CHECK (category IN (
    'tasks', 'calendar', 'orders', 'financial', 'inventory', 'team', 'system'
  )),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, channel, category)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_org ON notification_preferences(user_id, organization_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. PUSH_SUBSCRIPTIONS (Web Push API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Create notification for a user (used by server actions and triggers)
CREATE OR REPLACE FUNCTION create_notification(
  p_org_id UUID,
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (organization_id, recipient_id, type, title, body, link, metadata)
  VALUES (p_org_id, p_recipient_id, p_type, p_title, p_body, p_link, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM notifications
  WHERE recipient_id = p_user_id AND is_read = false;
$$;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE recipient_id = p_user_id AND is_read = false;
$$;

-- Complete a task atomically (sets status + completed_at + audit log)
CREATE OR REPLACE FUNCTION complete_task(
  p_task_id UUID,
  p_org_id UUID,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tasks
  SET status = 'done', completed_at = now(), updated_at = now()
  WHERE id = p_task_id AND organization_id = p_org_id AND status != 'done';

  PERFORM log_audit(p_org_id, p_user_id, 'task_completed', 'tasks', 'task', p_task_id);
END;
$$;

-- Get pending reminders that need to be sent (for backend cron processing)
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
  reminder_id UUID,
  event_id UUID,
  event_title TEXT,
  event_start_at TIMESTAMPTZ,
  event_org_id UUID,
  reminder_type TEXT,
  minutes_before INT,
  attendee_membership_id UUID,
  attendee_user_id UUID
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    er.id AS reminder_id,
    er.event_id,
    ce.title AS event_title,
    ce.start_at AS event_start_at,
    ce.organization_id AS event_org_id,
    er.reminder_type,
    er.minutes_before,
    ea.membership_id AS attendee_membership_id,
    m.user_id AS attendee_user_id
  FROM event_reminders er
  JOIN calendar_events ce ON ce.id = er.event_id
  LEFT JOIN event_attendees ea ON ea.event_id = ce.id
  LEFT JOIN memberships m ON m.id = ea.membership_id AND m.status = 'active'
  WHERE er.sent_at IS NULL
    AND ce.start_at - (er.minutes_before || ' minutes')::INTERVAL <= now()
    AND ce.start_at > now()
  ORDER BY ce.start_at ASC;
$$;

-- Mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(p_reminder_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE event_reminders SET sent_at = now() WHERE id = p_reminder_id;
$$;

-- ============================================================================
-- SEED PERMISSIONS FOR TASKS/CALENDAR/NOTIFICATIONS MODULE
-- ============================================================================
INSERT INTO permissions (permission_key, module, action, description) VALUES
  ('tasks.view', 'tasks', 'view', 'Visualizar tarefas'),
  ('tasks.create', 'tasks', 'create', 'Criar tarefas'),
  ('tasks.edit', 'tasks', 'edit', 'Editar tarefas'),
  ('tasks.delete', 'tasks', 'delete', 'Excluir tarefas'),
  ('tasks.assign', 'tasks', 'assign', 'Atribuir tarefas'),
  ('calendar.view', 'calendar', 'view', 'Visualizar agenda'),
  ('calendar.create', 'calendar', 'create', 'Criar eventos'),
  ('calendar.edit', 'calendar', 'edit', 'Editar eventos'),
  ('calendar.delete', 'calendar', 'delete', 'Excluir eventos'),
  ('notifications.view', 'notifications', 'view', 'Visualizar notificações'),
  ('notifications.manage_prefs', 'notifications', 'manage_prefs', 'Gerenciar preferências de notificação')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant new permissions to existing system roles
DO $$
DECLARE
  v_org RECORD;
  v_owner_role UUID;
  v_admin_role UUID;
  v_manager_role UUID;
  v_employee_role UUID;
BEGIN
  FOR v_org IN SELECT id FROM organizations
  LOOP
    SELECT id INTO v_owner_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'OWNER';
    SELECT id INTO v_admin_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'ADMIN';
    SELECT id INTO v_manager_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'MANAGER';
    SELECT id INTO v_employee_role FROM organization_roles WHERE organization_id = v_org.id AND name = 'EMPLOYEE';

    -- OWNER & ADMIN: all task/calendar/notification permissions
    IF v_owner_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_owner_role, p.id, true
      FROM permissions p WHERE p.module IN ('tasks', 'calendar', 'notifications')
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;

    IF v_admin_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_admin_role, p.id, true
      FROM permissions p WHERE p.module IN ('tasks', 'calendar', 'notifications')
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- MANAGER: view + create + edit tasks/calendar, view notifications
    IF v_manager_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_manager_role, p.id, true
      FROM permissions p
      WHERE p.permission_key IN (
        'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign',
        'calendar.view', 'calendar.create', 'calendar.edit',
        'notifications.view'
      )
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- EMPLOYEE: view tasks/calendar, view notifications
    IF v_employee_role IS NOT NULL THEN
      INSERT INTO role_permissions (organization_id, role_id, permission_id, granted)
      SELECT v_org.id, v_employee_role, p.id, true
      FROM permissions p
      WHERE p.permission_key IN (
        'tasks.view', 'tasks.create',
        'calendar.view',
        'notifications.view'
      )
      ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;