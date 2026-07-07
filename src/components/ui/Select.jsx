import { forwardRef } from 'react'

const Select = forwardRef(function Select(
  { className = '', error = false, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={`input appearance-none bg-no-repeat pr-9 ${
        error ? 'input-error' : ''
      } ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.6rem center',
      }}
      {...props}
    >
      {children}
    </select>
  )
})

export default Select
