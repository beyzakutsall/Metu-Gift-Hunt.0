import { Mail } from 'lucide-react'
import { Input, type InputProps } from '../common/Input'

export function EmailInput(props: Omit<InputProps, 'label'>) {
  return (
    <Input
      label="METU email"
      icon={Mail}
      type="email"
      inputMode="email"
      autoCapitalize="none"
      spellCheck={false}
      placeholder="e123456@metu.edu.tr"
      required
      {...props}
    />
  )
}
