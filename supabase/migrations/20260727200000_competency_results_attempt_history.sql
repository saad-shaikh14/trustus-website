-- Adds attempt history to competency_results so a candidate can be given a
-- second chance on the MCQ without losing the previous attempt's record.
-- Applied directly against the live project 2026-07-27 (Management API) —
-- this file is the versioned record of that change, see ADR 0003.

ALTER TABLE trustus.competency_results
  ADD COLUMN attempt_number integer NOT NULL DEFAULT 1,
  ADD COLUMN superseded_at timestamptz;

-- Enforce at most one "current" (non-superseded) attempt per application.
CREATE UNIQUE INDEX competency_results_one_current_per_app
  ON trustus.competency_results (application_id)
  WHERE superseded_at IS NULL;

-- View is not SELECT * — must be dropped and recreated to pick up new columns.
DROP VIEW IF EXISTS public.competency_results;

CREATE VIEW public.competency_results AS
SELECT id, application_id, mcq_score, section_scores, domain_ratings, strengths,
       development_areas, outcome, interviewer_name, completed_at, answers,
       mcq_submitted_at, score_viewed_at, attempt_number, superseded_at
FROM trustus.competency_results;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competency_results TO anon, authenticated, service_role;
