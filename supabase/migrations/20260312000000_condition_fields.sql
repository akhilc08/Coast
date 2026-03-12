-- supabase/migrations/009_condition_fields.sql

-- Add condition assessment columns to listings
ALTER TABLE public.listings
  ADD COLUMN overall_grade text CHECK (overall_grade IN ('excellent','good','fair','poor','salvage')),
  ADD COLUMN overall_notes text,
  ADD COLUMN paint_condition text CHECK (paint_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN body_condition  text CHECK (body_condition  IN ('excellent','good','fair','poor')),
  ADD COLUMN glass_condition text CHECK (glass_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN exterior_notes  text,
  ADD COLUMN seat_condition      text CHECK (seat_condition      IN ('excellent','good','fair','poor')),
  ADD COLUMN dashboard_condition text CHECK (dashboard_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN carpet_condition    text CHECK (carpet_condition    IN ('excellent','good','fair','poor')),
  ADD COLUMN interior_notes      text,
  ADD COLUMN engine_condition       text CHECK (engine_condition       IN ('excellent','good','fair','poor')),
  ADD COLUMN transmission_condition text CHECK (transmission_condition IN ('excellent','good','fair','poor')),
  ADD COLUMN brake_condition        text CHECK (brake_condition        IN ('excellent','good','fair','poor')),
  ADD COLUMN tire_condition         text CHECK (tire_condition         IN ('excellent','good','fair','poor')),
  ADD COLUMN tire_tread_depth       int  CHECK (tire_tread_depth BETWEEN 0 AND 12),
  ADD COLUMN mechanical_notes       text,
  ADD COLUMN known_issues           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN has_accident_history   boolean NOT NULL DEFAULT false,
  ADD COLUMN has_flood_damage       boolean NOT NULL DEFAULT false,
  ADD COLUMN has_frame_damage       boolean NOT NULL DEFAULT false,
  ADD COLUMN has_rebuilt_title      boolean NOT NULL DEFAULT false,
  ADD COLUMN has_lien               boolean NOT NULL DEFAULT false,
  ADD COLUMN is_former_rental       boolean NOT NULL DEFAULT false;

-- Extend document_type constraint to allow inspection_report
ALTER TABLE public.listing_documents
  DROP CONSTRAINT listing_documents_document_type_check,
  ADD CONSTRAINT listing_documents_document_type_check
    CHECK (document_type IN ('carfax','title','service_history','other','inspection_report'));
