-- =====================================================================
-- Optional sample data so the dashboards aren't empty during testing.
-- Run AFTER 0001_initial_schema.sql. Safe to run once.
-- Matches are generated automatically by triggers once a PA registers
-- with a specialty that equals one of these (case-insensitive).
-- =====================================================================

insert into public.opportunities
  (title, facility_name, facility_type, location, specialty, position_type, compensation, compensation_type, description)
values
  ('Emergency Medicine PA', 'Cedar Ridge Regional Hospital', 'Hospital', 'Denver, CO', 'Emergency Medicine', 'Permanent', '$145,000 - $165,000', 'annual', 'Level II trauma center seeking an experienced EM PA. 12-hour shifts, generous shift differentials, full benefits and relocation assistance.'),
  ('Orthopedic Surgery PA — First Assist', 'Lakeshore Orthopedics', 'Specialty Clinic', 'Minneapolis, MN', 'Orthopedics', 'Permanent', '$130,000 - $150,000', 'annual', 'Busy ortho practice seeking a surgical first-assist PA. OR + clinic split, no overnight call.'),
  ('Family Medicine PA', 'Prairie Community Health Center', 'FQHC', 'Wichita, KS', 'Family Medicine', 'Permanent', '$110,000 - $125,000', 'annual', 'FQHC serving a growing rural community. Loan repayment eligible (NHSC), 4-day work week available.'),
  ('Locum Hospitalist PA', 'St. Augustine Medical Center', 'Hospital', 'Jacksonville, FL', 'Hospital Medicine', 'Locum', '$95 - $110 / hr', 'hourly', '13-week locum coverage, day-shift hospitalist team. Housing + travel covered.'),
  ('Dermatology PA', 'Clear Skin Dermatology', 'Specialty Clinic', 'Scottsdale, AZ', 'Dermatology', 'Permanent', '$140,000 - $180,000', 'annual', 'Cosmetic + medical derm. Strong mentorship and production bonus structure.'),
  ('Cardiology PA — Inpatient', 'Heartland Cardiovascular Institute', 'Hospital', 'Indianapolis, IN', 'Cardiology', 'Contract', '$120,000 - $140,000', 'annual', '12-month contract supporting the inpatient cardiology service. Possible conversion to permanent.')
on conflict do nothing;

insert into public.facilities
  (facility_name, facility_type, location, contact_name, contact_title, contact_email, contact_phone, roles_needed, position_type, timeline, compensation_range, notes, status)
values
  ('Cedar Ridge Regional Hospital', 'Hospital', 'Denver, CO', 'Dana Whitfield', 'Director of Provider Recruitment', 'dwhitfield@example.com', '(303) 555-0142', '2x Emergency Medicine PA', 'Permanent', 'Hiring now', '$145k - $165k', 'Trauma II, wants candidates with 2+ yrs EM.', 'new'),
  ('Prairie Community Health Center', 'FQHC', 'Wichita, KS', 'Marcus Lee', 'COO', 'mlee@example.com', '(316) 555-0190', 'Family Medicine PA', 'Permanent', 'Within 60 days', '$110k - $125k', 'NHSC loan repayment site.', 'in_progress'),
  ('Clear Skin Dermatology', 'Specialty Clinic', 'Scottsdale, AZ', 'Priya Nair', 'Practice Manager', 'pnair@example.com', '(480) 555-0177', 'Dermatology PA', 'Permanent', 'Flexible', '$140k - $180k', 'Open to new grads with derm rotation.', 'new'),
  ('St. Augustine Medical Center', 'Hospital', 'Jacksonville, FL', 'Robert Tran', 'Medical Staffing Lead', 'rtran@example.com', '(904) 555-0123', 'Hospitalist PA (locum)', 'Locum', 'ASAP — 13 weeks', '$95 - $110 / hr', 'Day shift only.', 'closed')
on conflict do nothing;
