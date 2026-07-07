import { forwardRef } from 'react'

const Textarea = forwardRef(function Textarea(
  { className = '', error = false, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`input resize-y ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
  )
})

export default Textarea
