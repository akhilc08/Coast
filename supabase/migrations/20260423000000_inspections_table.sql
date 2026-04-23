CREATE TABLE public.inspections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            uuid        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  inspection_date       date,
  inspector_name        text,
  mileage_at_inspection int,
  exterior              jsonb,
  interior              jsonb,
  mechanical            jsonb,
  tires                 jsonb,
  overall_grade         text CHECK (overall_grade IN ('excellent', 'good', 'fair', 'poor')),
  submitted_by          uuid        REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Only admins can read or write inspections
CREATE POLICY "admins_manage_inspections"
  ON public.inspections
  FOR ALL
  TO authenticated
  USING  (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
