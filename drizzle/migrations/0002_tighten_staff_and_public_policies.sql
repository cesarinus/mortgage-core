CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    AND role IN ('admin','loan_officer','processor','assistant'))
$$;
CREATE OR REPLACE FUNCTION public.is_app_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_app_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_member() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.run_integrity_scan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_integrity_scan() TO service_role;

ALTER POLICY "audit_insert_authenticated" ON public.person_audit_log WITH CHECK (public.is_staff());
ALTER POLICY "audit_select_authenticated" ON public.person_audit_log USING (public.is_staff());
ALTER POLICY "person_roles_insert_authenticated" ON public.person_roles WITH CHECK (public.is_staff());
ALTER POLICY "person_roles_select_authenticated" ON public.person_roles USING (public.is_staff());
ALTER POLICY "people_insert_authenticated" ON public.people WITH CHECK (public.is_staff());
ALTER POLICY "people_select_authenticated" ON public.people USING (public.is_staff());
ALTER POLICY "auth read companies" ON public.crm_companies USING (public.is_staff());
ALTER POLICY "values read" ON public.crm_field_values USING (public.is_staff());
ALTER POLICY "read audit logs" ON public.crm_audit_logs USING (public.is_staff());
ALTER POLICY "auth read integ_conn" ON public.integration_connections USING (public.is_staff());
ALTER POLICY "auth read health" ON public.integration_health_snapshots USING (public.is_staff());
ALTER POLICY "auth read arive_sync_jobs" ON public.arive_sync_jobs USING (public.is_staff());
ALTER POLICY "auth read sec_settings" ON public.security_settings USING (public.is_staff());
ALTER POLICY "auth read rec_perms" ON public.record_permissions USING (public.is_staff());
ALTER POLICY "Authenticated read system_integrity_checks" ON public.system_integrity_checks USING (public.is_staff());
ALTER POLICY "Authenticated read entity_registry" ON public.entity_registry USING (public.is_staff());
ALTER POLICY "Read stage analytics" ON public.pipeline_stage_analytics_daily USING (public.is_staff());
ALTER POLICY "Read lead source analytics" ON public.lead_source_analytics_daily USING (public.is_staff());
ALTER POLICY "Read lead source rules" ON public.lead_source_rules USING (public.is_staff());
ALTER POLICY "Authenticated can read mappings" ON public.los_field_mappings USING (public.is_staff());
ALTER POLICY "Read notification templates" ON public.notification_templates USING (public.is_staff());
ALTER POLICY "Authenticated users can update tasks" ON public.tasks USING (public.is_staff());
ALTER POLICY "Authenticated users can delete social posts" ON public.social_posts USING (public.is_staff());
ALTER POLICY "oe_insert_service" ON public.opportunity_events WITH CHECK (public.is_staff());
ALTER POLICY "auth insert sec_events" ON public.security_events WITH CHECK (user_id = auth.uid());

ALTER POLICY "modules read" ON public.crm_modules USING (public.is_app_member());
ALTER POLICY "options read" ON public.crm_field_options USING (public.is_app_member());
ALTER POLICY "auth read field perms" ON public.crm_field_permissions USING (public.is_app_member());
ALTER POLICY "read section perms" ON public.crm_section_permissions USING (public.is_app_member());
ALTER POLICY "auth read role_perms" ON public.role_permissions USING (public.is_app_member());
ALTER POLICY "auth read layout versions" ON public.crm_layout_versions USING (public.is_app_member());
ALTER POLICY "auth read layouts" ON public.crm_layouts USING (public.is_app_member());
ALTER POLICY "Read stage requirements" ON public.pipeline_stage_requirements USING (public.is_app_member());
ALTER POLICY "auth read field conds" ON public.crm_field_conditions USING (public.is_app_member());
ALTER POLICY "auth read roles" ON public.roles USING (public.is_app_member());
ALTER POLICY "Authenticated read stage_documents" ON public.stage_documents USING (public.is_app_member());
ALTER POLICY "read layout templates" ON public.crm_layout_templates USING (public.is_app_member());
ALTER POLICY "fields read" ON public.crm_fields USING (public.is_app_member());
ALTER POLICY "auth read permissions" ON public.permissions USING (public.is_app_member());
ALTER POLICY "Authenticated read transitions" ON public.status_transitions USING (public.is_app_member());
ALTER POLICY "lt_read_auth" ON public.lifecycle_transitions USING (public.is_app_member());
ALTER POLICY "Read pipeline stages" ON public.pipeline_stages USING (public.is_app_member());
ALTER POLICY "Read stage rules" ON public.pipeline_stage_rules USING (public.is_app_member());

ALTER POLICY "Anyone can create bookings" ON public.bookings WITH CHECK (
  lead_id IS NULL AND end_at > start_at AND start_at > now()
  AND length(email) BETWEEN 3 AND 320 AND position('@' in email) > 1
  AND length(first_name) BETWEEN 1 AND 100 AND length(last_name) BETWEEN 1 AND 100);
ALTER POLICY "Anyone can insert variants" ON public.blog_variants WITH CHECK (length(session_id::text) BETWEEN 8 AND 128);
ALTER POLICY "Anyone can insert metrics" ON public.blog_variant_metrics WITH CHECK (length(session_id::text) BETWEEN 8 AND 128 AND length(event_type) <= 64);
ALTER POLICY "Anyone can insert events" ON public.blog_events WITH CHECK (length(session_id::text) BETWEEN 8 AND 128 AND length(event_type) <= 64 AND points BETWEEN 0 AND 100);
ALTER POLICY "Anyone can update sessions" ON public.blog_sessions USING (lead_id IS NULL) WITH CHECK (lead_id IS NULL AND total_score BETWEEN 0 AND 10000);

ALTER POLICY "social-images authenticated read" ON storage.objects USING (bucket_id = 'social-images' AND public.is_staff());
ALTER POLICY "social-images authenticated insert" ON storage.objects WITH CHECK (bucket_id = 'social-images' AND public.is_staff() AND owner = auth.uid());
ALTER POLICY "social-images authenticated update" ON storage.objects USING (bucket_id = 'social-images' AND public.is_staff() AND owner = auth.uid());
ALTER POLICY "social-images authenticated delete" ON storage.objects USING (bucket_id = 'social-images' AND public.is_staff() AND owner = auth.uid());