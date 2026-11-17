import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

export type DropdownOption = {
  value: string
  label: ReactNode
  disabled?: boolean
}

type DropdownSelectProps = {
  value?: string | undefined
  onValueChange: (value: string) => void
  options: readonly DropdownOption[]
  placeholder?: string | undefined
  disabled?: boolean | undefined
  id?: string | undefined
  'aria-label'?: string | undefined
  'aria-describedby'?: string | undefined
  'aria-invalid'?: boolean | undefined
  className?: string | undefined
  contentClassName?: string | undefined
  triggerProps?:
    Omit<ComponentProps<typeof SelectPrimitive.Trigger>, 'id' | 'className'> | undefined
}

export function DropdownSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Chọn một mục',
  disabled = false,
  id,
  className,
  contentClassName,
  triggerProps,
  ...ariaProps
}: DropdownSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        {...triggerProps}
        {...ariaProps}
        id={id}
        className={cn(
          'group flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white px-3.5 py-2.5 text-left text-sm text-ink-primary shadow-sm outline-none transition-[border-color,box-shadow,background-color]',
          'hover:border-ink-muted data-[state=open]:border-action-primary data-[state=open]:bg-surface-blue/30 data-[state=open]:ring-2 data-[state=open]:ring-action-primary/20',
          'data-[placeholder]:text-ink-secondary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
          'aria-[invalid=true]:border-danger-foreground aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger-foreground/20',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-ink-secondary transition-transform duration-150 group-data-[state=open]:rotate-180"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-border-subtle bg-white p-1.5 shadow-raised outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            contentClassName,
          )}
        >
          <SelectPrimitive.ScrollUpButton className="grid h-7 place-items-center text-ink-secondary">
            <ChevronUp aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-0.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-10 cursor-pointer select-none items-center rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none transition-colors data-[highlighted]:bg-surface-blue data-[highlighted]:text-action-primary data-[state=checked]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-45"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-3 text-action-primary">
                  <Check aria-hidden="true" className="size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="grid h-7 place-items-center text-ink-secondary">
            <ChevronDown aria-hidden="true" className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
