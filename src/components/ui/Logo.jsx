export default function Logo({ className = '', dark = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="s1-logo-grad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B4F8A" />
            <stop offset="60%" stopColor="#2E6DB4" />
            <stop offset="100%" stopColor="#6EB43F" />
          </linearGradient>
        </defs>
        <rect width="34" height="34" rx="9" fill="url(#s1-logo-grad)" />
        <path
          d="M22.5 12.2c-.9-1-2.2-1.6-3.8-1.6-2.5 0-4 1.2-4 3 0 1.6 1.1 2.4 3.3 2.9l1.5.3c2.9.6 4.4 1.9 4.4 4.2 0 2.7-2.3 4.5-5.8 4.5-2.5 0-4.5-.8-5.7-2.3"
          stroke="#fff"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span
        className={`text-[15px] font-extrabold tracking-headline ${
          dark ? 'text-white' : 'text-navy'
        }`}
      >
        Season <span className="text-brand-green">One</span>
      </span>
    </div>
  )
}
