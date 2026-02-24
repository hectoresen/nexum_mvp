import { ButtonHTMLAttributes } from 'react'
import { useAppTheme } from '../hooks/useAppTheme'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children: React.ReactNode
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-6 py-2',
  lg: 'px-8 py-3 text-lg',
}

export function Button({ variant = 'primary', size = 'md', fullWidth = false, className = '', children, disabled, ...props }: ButtonProps) {
  const { tw } = useAppTheme()
  
  const variantClasses = {
    primary: tw.btnPrimary,
    secondary: tw.btnSecondary,
    danger: tw.btnDanger,
    warning: 'bg-amber-600 hover:bg-amber-500',
  }
  
  const baseClasses = `${tw.textPrimary} font-normal rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`
  const widthClass = fullWidth ? 'w-full' : ''
  const combinedClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`

  return (
    <button className={combinedClasses} disabled={disabled} {...props}>
      {children}
    </button>
  )
}

// Specific button components for common use cases
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />
}

export function WarningButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="warning" {...props} />
}

// Cancel button - commonly used in modals
export function CancelButton(props: Omit<ButtonProps, 'variant' | 'children'>) {
  return <SecondaryButton {...props}>Cancel</SecondaryButton>
}

// Submit button - commonly used in forms
export function SubmitButton({ children = 'Submit', ...props }: Omit<ButtonProps, 'variant' | 'type'>) {
  return (
    <PrimaryButton type="submit" {...props}>
      {children}
    </PrimaryButton>
  )
}

// Save button - commonly used in settings
export function SaveButton({ children = 'Save', ...props }: Omit<ButtonProps, 'variant' | 'type'>) {
  return (
    <PrimaryButton type="button" {...props}>
      {children}
    </PrimaryButton>
  )
}

// Delete button - destructive action
export function DeleteButton({ children = 'Delete', ...props }: Omit<ButtonProps, 'variant'>) {
  return <DangerButton {...props}>{children}</DangerButton>
}

// Close button - for modals/dialogs
export function CloseButton(props: Omit<ButtonProps, 'variant' | 'children'>) {
  return <SecondaryButton {...props}>Close</SecondaryButton>
}
