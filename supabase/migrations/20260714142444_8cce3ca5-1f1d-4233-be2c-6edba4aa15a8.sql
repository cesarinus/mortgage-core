CREATE POLICY "social-images authenticated read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'social-images');
CREATE POLICY "social-images authenticated insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'social-images');
CREATE POLICY "social-images authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'social-images');
CREATE POLICY "social-images authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'social-images');