-- =====================================================================
-- Recruiter outreach now defaults to opted-in at signup — the Register
-- flow's consent checkbox ("I agree to the Terms of Service and Privacy
-- Policy... and I consent to being discoverable by recruiters") covers
-- the legal basis for this, so new PA accounts no longer need a second,
-- separate opt-in step. Turning it off remains available at any time in
-- My Profile → Settings (src/pages/dashboard/Profile.jsx).
--
-- Only changes the column default for rows inserted from now on —
-- existing users keep whatever value they already have (don't
-- retroactively opt anyone in without their own consent).
-- =====================================================================

alter table public.users
  alter column open_to_recruiter_outreach set default true;
