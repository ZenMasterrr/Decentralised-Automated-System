'use client'

import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'


const Switch = React.forwardRef<HTMLButtonElement, {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
  id?: string
  name?: string
  value?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}>(({ 
  checked, 
  onCheckedChange, 
  className, 
  disabled,
  id,
  name,
  value,
  ...props 
}, ref) => {
  const [isChecked, setIsChecked] = React.useState(checked ?? false)
  const isControlled = checked !== undefined
  const isCheckedState = isControlled ? checked : isChecked

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked
    if (!isControlled) {
      setIsChecked(newChecked)
    }
    onCheckedChange?.(newChecked)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isCheckedState}
      disabled={disabled}
      id={id}
      name={name}
      value={value}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        isCheckedState ? 'bg-primary' : 'bg-input',
        className
      )}
      onClick={() => onCheckedChange?.(!isCheckedState)}
      ref={ref}
      {...props}
    >
      <span
        className={
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ' +
          (isCheckedState ? 'translate-x-5' : 'translate-x-0')
        }
      />
    </button>
  )
})

Switch.displayName = 'Switch'

export { Switch }
