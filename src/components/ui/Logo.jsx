export default function Logo({ className = '', dark = false }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-btn bg-blue font-extrabold tracking-tight text-white">
        S1
      </span>
      <span
        className={`text-[15px] font-extrabold tracking-headline ${
          dark ? 'text-white' : 'text-navy'
        }`}
      >
        Season One
      </span>
    </div>
  )
}
