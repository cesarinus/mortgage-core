
-- Drop duplicate / typo'd Arive mappings so each external field has exactly one source.
DELETE FROM public.los_field_mappings
 WHERE integration = 'arive'
   AND (
        (crm_field = 'transaction_type'   AND external_field = 'loanPurpose')
     OR (crm_field = 'loan_officer_name'  AND external_field = 'assigneeEmail')
     OR (crm_field = 'lien_positon'       AND external_field = 'lienPosition')  -- typo row
   );

-- Ensure canonical rows are required + active.
UPDATE public.los_field_mappings
   SET required = true, active = true
 WHERE integration = 'arive'
   AND ((crm_field = 'lien_position'      AND external_field = 'lienPosition')
     OR (crm_field = 'loan_officer_email' AND external_field = 'assigneeEmail')
     OR (crm_field = 'occupancy_type'     AND external_field = 'borrower_occupancy')
     OR (crm_field = 'loan_purpose'       AND external_field = 'loanPurpose'));
