
-- Add admin full CRUD policies to all tables missing DELETE/INSERT/UPDATE for admins

-- attendance
CREATE POLICY "Admins can manage all attendance" ON public.attendance FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- chat_conversations
CREATE POLICY "Admins can manage all conversations" ON public.chat_conversations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- chat_messages
CREATE POLICY "Admins can manage all messages" ON public.chat_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- chat_participants
CREATE POLICY "Admins can manage all participants" ON public.chat_participants FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- compliance_evidence
CREATE POLICY "Admins can manage all evidence" ON public.compliance_evidence FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- customer_support_ticket_comments
CREATE POLICY "Admins can manage all ticket comments" ON public.customer_support_ticket_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- deal_activities
CREATE POLICY "Admins can manage all deal activities" ON public.deal_activities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- deal_registration_comments
CREATE POLICY "Admins can manage all registration comments" ON public.deal_registration_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- deal_registration_history
CREATE POLICY "Admins can manage all registration history" ON public.deal_registration_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- deal_registrations
CREATE POLICY "Admins can manage all deal registrations" ON public.deal_registrations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- deal_stage_progression_log
CREATE POLICY "Admins can manage all progression logs" ON public.deal_stage_progression_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- email_sequence_enrollments
CREATE POLICY "Admins can manage all enrollments" ON public.email_sequence_enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- employee_mood_logs
CREATE POLICY "Admins can manage all mood logs" ON public.employee_mood_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- event_wishes
CREATE POLICY "Admins can manage all event wishes" ON public.event_wishes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- exchange_rate_history
CREATE POLICY "Admins can manage exchange rate history" ON public.exchange_rate_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- leave_requests
CREATE POLICY "Admins can manage all leave requests" ON public.leave_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- legal_document_approvals
CREATE POLICY "Admins can manage all legal approvals" ON public.legal_document_approvals FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- notification_preferences
CREATE POLICY "Admins can manage all notification prefs" ON public.notification_preferences FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- onboarding_requests
CREATE POLICY "Admins can manage all onboarding requests" ON public.onboarding_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- order_processing_requests
CREATE POLICY "Admins can manage all order requests" ON public.order_processing_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- organization_settings
CREATE POLICY "Admins can manage all org settings" ON public.organization_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- payment_records
CREATE POLICY "Admins can manage all payment records" ON public.payment_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- post_sale_workflows
CREATE POLICY "Admins can manage all post sale workflows" ON public.post_sale_workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- request_comments
CREATE POLICY "Admins can manage all request comments" ON public.request_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- request_history
CREATE POLICY "Admins can manage all request history" ON public.request_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- resignation_requests
CREATE POLICY "Admins can manage all resignation requests" ON public.resignation_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- sales_forecasts
CREATE POLICY "Admins can manage all sales forecasts" ON public.sales_forecasts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- sales_funnel_workflows
CREATE POLICY "Admins can manage all funnel workflows" ON public.sales_funnel_workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- solution_expiry_notifications
CREATE POLICY "Admins can manage all expiry notifications" ON public.solution_expiry_notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- sop_versions
CREATE POLICY "Admins can manage all sop versions" ON public.sop_versions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- team_chat_messages
CREATE POLICY "Admins can manage all team messages" ON public.team_chat_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- tenant_audit_log
CREATE POLICY "Admins can manage audit logs" ON public.tenant_audit_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- tender_activities
CREATE POLICY "Admins can manage all tender activities" ON public.tender_activities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ticket_comments
CREATE POLICY "Admins can manage all ticket comments2" ON public.ticket_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ticket_history
CREATE POLICY "Admins can manage all ticket history" ON public.ticket_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- user_roles
CREATE POLICY "Admins can manage all user roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- video_calls
CREATE POLICY "Admins can manage all video calls" ON public.video_calls FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- workflow_comments
CREATE POLICY "Admins can manage all workflow comments" ON public.workflow_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- workflow_logs
CREATE POLICY "Admins can manage all workflow logs" ON public.workflow_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- workflow_stage_history
CREATE POLICY "Admins can manage all stage history" ON public.workflow_stage_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
