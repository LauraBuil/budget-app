import { InlineEditableText } from '../ui/InlineEditableText'

interface InlineEditableNameProps {
  name: string
  ariaLabel: string
  onSave: (name: string) => Promise<void>
}

export function InlineEditableName({ name, ariaLabel, onSave }: InlineEditableNameProps) {
  return <InlineEditableText value={name} label={ariaLabel} onSave={onSave} buttonClassName="inline-name-button" inputClassName="inline-name-input" />
}
