// Where to send logged-out visitors (the existing marketing site).
export const MARKETING_SITE = 'https://seasononehealthcare.com'

// Web3Forms access key for the "My Team" contact form.
export const WEB3FORMS_KEY =
  import.meta.env.VITE_WEB3FORMS_KEY || '29ab9da0-4cba-45a4-a0dc-57e0b49e7737'

export const SUPPORT_EMAIL = 'support@seasononehealthcare.com'

// ---- Enum option lists (kept in sync with the SQL schema) ----
export const CREDENTIALS = ['PA-C', 'PA Student']

export const FACILITY_TYPES = [
  'Hospital',
  'CAH',
  'FQHC',
  'RHC',
  'Tribal Health',
  'Specialty Clinic',
  'Other',
]

export const POSITION_TYPES = ['Permanent', 'Locum', 'Contract']

export const COMPENSATION_TYPES = ['hourly', 'annual']

export const MATCH_STATUSES = [
  'new',
  'viewed',
  'interested',
  'not_interested',
  'in_progress',
  'placed',
]

export const FACILITY_STATUSES = ['new', 'in_progress', 'placed', 'closed']

export const AVAILABILITY_OPTIONS = [
  'Immediately',
  'Within 30 days',
  '30–60 days',
  '60–90 days',
  'Just exploring',
]

// Common PA specialties for the select inputs.
export const SPECIALTIES = [
  'Family Medicine',
  'Emergency Medicine',
  'Hospital Medicine',
  'Internal Medicine',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'General Surgery',
  'Cardiothoracic Surgery',
  'Neurosurgery',
  'Urology',
  'Gastroenterology',
  'Pulmonology',
  'Nephrology',
  'Endocrinology',
  'Oncology',
  'Hematology',
  'Pediatrics',
  'Psychiatry',
  'Neurology',
  'OB/GYN',
  'Urgent Care',
  'Pain Management',
  'Anesthesiology',
  'Radiology',
  'Nephrology',
  'Rheumatology',
  'Infectious Disease',
  'Occupational Medicine',
  'Other',
]

// ---- Display helpers for statuses ----
export const MATCH_STATUS_LABELS = {
  new: 'New',
  viewed: 'Viewed',
  interested: 'Interested',
  not_interested: 'Not for me',
  in_progress: 'In progress',
  placed: 'Placed',
}

export const FACILITY_STATUS_LABELS = {
  new: 'New',
  in_progress: 'In progress',
  placed: 'Placed',
  closed: 'Closed',
}

// Tailwind class sets for the status / type badges.
export const MATCH_STATUS_STYLES = {
  new: 'bg-blue text-white',
  viewed: 'bg-blue-light text-blue-dark',
  interested: 'bg-emerald-100 text-emerald-700',
  not_interested: 'bg-gray-100 text-text-muted',
  in_progress: 'bg-amber-100 text-amber-700',
  placed: 'bg-emerald-600 text-white',
}

export const FACILITY_STATUS_STYLES = {
  new: 'bg-blue text-white',
  in_progress: 'bg-amber-100 text-amber-700',
  placed: 'bg-emerald-600 text-white',
  closed: 'bg-gray-100 text-text-muted',
}

export const POSITION_TYPE_STYLES = {
  Permanent: 'bg-blue-light text-blue-dark border border-blue-border',
  Locum: 'bg-amber-50 text-amber-700 border border-amber-200',
  Contract: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}
