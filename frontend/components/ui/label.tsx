'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
)

export interface LabelProps 
  extends Omit<React.LabelHTMLAttributes<HTMLLabelElement>, 'asChild'>,
    VariantProps<typeof labelVariants> {
  asChild?: boolean
  className?: string
  children?: React.ReactNode
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ 
  className, 
  asChild = false, 
  children,
  ...props 
}, ref) => {
  const Comp = asChild ? Slot : 'label'
  return (
    <Comp
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    >
      {children}
    </Comp>
  )
})

Label.displayName = 'Label'

export { Label }