-- Replace word-based overall_grade constraint with letter grades (A+ through F)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_overall_grade_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_overall_grade_check
  CHECK (overall_grade IN ('A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F'));

-- Clear any legacy word-based values so existing rows don't violate the new constraint
UPDATE listings
SET overall_grade = NULL
WHERE overall_grade IN ('excellent','good','fair','poor','salvage');
