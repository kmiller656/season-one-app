import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { className = '', error = false, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={`input ${error ? 'input-error' : ''} ${className}`}
      {...props}
    />
  )
})

export default Input
