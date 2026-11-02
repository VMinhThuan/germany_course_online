import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as LabelPrimitive from '@radix-ui/react-label'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Check, ChevronDown, ChevronUp, Eye, EyeOff, Search, X } from 'lucide-react'
import {
  forwardRef,
  type ComponentProps,
  type InputHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from 'react'
import { cn } from './cn'

export function FormLabel({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      {...props}
      className={cn(
        'inline-flex min-h-6 items-center gap-1.5 text-sm font-semibold text-ink-primary',
        className,
      )}
    />
  )
}

export function FormDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn('text-sm leading-5 text-ink-secondary', className)} />
}

export function FormMessage({
  id,
  children,
  className,
}: {
  id: string
  children?: ReactNode
  className?: string
}) {
  if (!children) return null
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'flex items-start gap-1.5 text-sm font-medium text-danger-foreground',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 inline-grid size-4 shrink-0 place-items-center rounded-full border border-current text-[0.65rem] leading-none"
      >
        !
      </span>
      <span>{children}</span>
    </p>
  )
}

export function FormField({
  id,
  label,
  description,
  error,
  required,
  optional,
  className,
  children,
}: {
  id: string
  label: string
  description?: string
  error?: string | undefined
  required?: boolean
  optional?: boolean
  className?: string
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode
}) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-center gap-2">
        <FormLabel htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-danger-foreground">
              *
            </span>
          )}
        </FormLabel>
        {optional && <span className="text-xs text-ink-muted">Không bắt buộc</span>}
      </div>
      {description && <FormDescription id={descriptionId}>{description}</FormDescription>}
      {children(describedBy, Boolean(error))}
      <FormMessage id={errorId ?? `${id}-error`}>{error}</FormMessage>
    </div>
  )
}

const inputClassName =
  'min-h-11 w-full rounded-control border border-border-strong bg-card-surface px-3.5 py-2.5 text-base text-ink-primary outline-none transition-[border-color,box-shadow] placeholder:text-ink-muted hover:border-ink-muted focus:border-action-primary focus-visible:ring-2 focus-visible:ring-action-primary/20 aria-[invalid=true]:border-danger-foreground aria-[invalid=true]:focus-visible:ring-danger-foreground/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted read-only:bg-surface-muted'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode
  trailingAction?: ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, leadingIcon, trailingAction, ...props }, ref) => (
    <div className="relative">
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-ink-muted">
          {leadingIcon}
        </span>
      )}
      <input
        {...props}
        ref={ref}
        className={cn(inputClassName, leadingIcon && 'pl-10', trailingAction && 'pr-12', className)}
      />
      {trailingAction && (
        <span className="absolute inset-y-0 right-1 grid place-items-center">{trailingAction}</span>
      )}
    </div>
  ),
)
TextInput.displayName = 'TextInput'

export function EmailInput(props: Omit<TextInputProps, 'type'>) {
  return (
    <TextInput
      {...props}
      type="email"
      autoComplete={props.autoComplete ?? 'email'}
      inputMode="email"
    />
  )
}

export function PasswordInput({
  autoComplete,
  ...props
}: Omit<TextInputProps, 'type' | 'trailingAction'>) {
  const [visible, setVisible] = useState(false)
  const label = visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
  return (
    <TextInput
      {...props}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete ?? 'current-password'}
      trailingAction={
        <button
          type="button"
          aria-label={label}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="grid size-10 place-items-center rounded-lg text-ink-secondary hover:bg-surface-muted focus-visible:outline-offset-0"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      }
    />
  )
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea {...props} ref={ref} className={cn(inputClassName, 'min-h-28 resize-y', className)} />
))
Textarea.displayName = 'Textarea'

export function SelectField({
  id,
  label,
  placeholder = 'Chọn một mục',
  value,
  onValueChange,
  options,
  description,
  error,
  disabled,
}: {
  id: string
  label: string
  placeholder?: string
  value?: string
  onValueChange: (value: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
  description?: string
  error?: string | undefined
  disabled?: boolean
}) {
  return (
    <FormField
      id={id}
      label={label}
      {...(description ? { description } : {})}
      {...(error ? { error } : {})}
    >
      {(describedBy, invalid) => (
        <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(
              inputClassName,
              'flex items-center justify-between text-left data-[placeholder]:text-ink-secondary',
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown aria-hidden="true" className="size-4 text-ink-secondary" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={5}
              className="z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border-subtle bg-card-surface shadow-raised"
            >
              <SelectPrimitive.ScrollUpButton className="grid h-8 place-items-center">
                <ChevronUp aria-hidden="true" className="size-4" />
              </SelectPrimitive.ScrollUpButton>
              <SelectPrimitive.Viewport className="p-1">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="relative flex min-h-10 cursor-default select-none items-center rounded-lg py-2 pl-9 pr-3 text-sm outline-none data-[highlighted]:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <SelectPrimitive.ItemIndicator className="absolute left-3">
                      <Check aria-hidden="true" className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
              <SelectPrimitive.ScrollDownButton className="grid h-8 place-items-center">
                <ChevronDown aria-hidden="true" className="size-4" />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      )}
    </FormField>
  )
}

export function Checkbox({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string
  label: ReactNode
  description?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
        disabled={disabled}
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-border-strong bg-card-surface text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 data-[state=checked]:border-action-primary data-[state=checked]:bg-action-primary data-[disabled]:opacity-50"
      >
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden="true" className="size-3.5" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <div className="grid gap-0.5">
        <FormLabel htmlFor={id} className="cursor-pointer leading-6">
          {label}
        </FormLabel>
        {description && <FormDescription>{description}</FormDescription>}
      </div>
    </div>
  )
}

export function RadioGroup({
  id,
  label,
  value,
  onValueChange,
  options,
  orientation = 'vertical',
}: {
  id: string
  label: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string; description?: string }[]
  orientation?: 'vertical' | 'horizontal'
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-semibold text-ink-primary">{label}</legend>
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-wrap')}
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`
          return (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupPrimitive.Item
                id={optionId}
                value={option.value}
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border-strong bg-card-surface outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 data-[state=checked]:border-action-primary"
              >
                <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-action-primary" />
              </RadioGroupPrimitive.Item>
              <div className="grid gap-0.5">
                <FormLabel htmlFor={optionId} className="cursor-pointer">
                  {option.label}
                </FormLabel>
                {option.description && <FormDescription>{option.description}</FormDescription>}
              </div>
            </div>
          )
        })}
      </RadioGroupPrimitive.Root>
    </fieldset>
  )
}

export function Switch({
  id,
  label,
  checked,
  onCheckedChange,
  description,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-0.5">
        <FormLabel htmlFor={id} className="cursor-pointer">
          {label}
        </FormLabel>
        {description && <FormDescription>{description}</FormDescription>}
      </div>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 rounded-full bg-border-strong outline-none transition-colors focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 data-[state=checked]:bg-action-primary"
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-soft transition-transform data-[state=checked]:translate-x-[1.375rem] motion-reduce:transition-none" />
      </SwitchPrimitive.Root>
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  onClear,
  label = 'Tìm kiếm',
  placeholder = 'Tìm kiếm…',
  className,
  id,
}: {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  label?: string
  placeholder?: string
  className?: string
  id?: string
}) {
  const generatedId = useId()
  const searchId = id ?? `search-${generatedId}`
  return (
    <div className={cn('relative', className)}>
      <label className="sr-only" htmlFor={searchId}>
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
      />
      <input
        id={searchId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(inputClassName, 'pl-10 pr-11')}
      />
      {value && onClear && (
        <button
          type="button"
          aria-label="Xóa nội dung tìm kiếm"
          onClick={onClear}
          className="absolute right-1 top-1 grid size-9 place-items-center rounded-lg text-ink-secondary hover:bg-surface-muted"
        >
          <X aria-hidden="true" size={16} />
        </button>
      )}
    </div>
  )
}

export interface RHFTextInputProps<T extends FieldValues> extends Omit<
  TextInputProps,
  'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: string
}

export function RHFTextInput<T extends FieldValues>({
  control,
  name,
  label,
  description,
  id,
  type = 'text',
  required,
  ...inputProps
}: RHFTextInputProps<T>) {
  const { field, fieldState } = useController({ control, name })
  const fieldId = id ?? String(name).replaceAll('.', '-')
  return (
    <FormField
      id={fieldId}
      label={label}
      {...(description ? { description } : {})}
      {...(fieldState.error?.message ? { error: fieldState.error.message } : {})}
      {...(required !== undefined ? { required } : {})}
    >
      {(describedBy, invalid) => (
        <TextInput
          {...inputProps}
          {...field}
          id={fieldId}
          type={type}
          value={field.value ?? ''}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
        />
      )}
    </FormField>
  )
}

export function FormErrorSummary({
  title = 'Hãy kiểm tra thông tin',
  errors,
}: {
  title?: string
  errors: string[]
}) {
  if (errors.length === 0) return null
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger-foreground/25 bg-danger-surface p-4 text-danger-foreground"
    >
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {errors.map((error, index) => (
          <li key={`${error}-${index}`}>{error}</li>
        ))}
      </ul>
    </div>
  )
}

export function useInputAttributes() {
  return { className: inputClassName }
}
