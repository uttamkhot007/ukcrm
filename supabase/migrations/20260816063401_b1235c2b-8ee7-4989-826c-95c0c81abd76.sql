DELETE FROM public.document_template_versions
WHERE template_id IN (
  SELECT id FROM public.document_templates
  WHERE library_key = 'proposal-managed-services'
);

DELETE FROM public.document_templates
WHERE library_key = 'proposal-managed-services';