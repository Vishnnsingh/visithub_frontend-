import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

type FieldShellProps = {
  label: string;
  error?: string;
  optional?: boolean;
  plain?: boolean;
  hint?: string;
};

function FieldLabel({ label, optional, plain }: Pick<FieldShellProps, 'label' | 'optional' | 'plain'>) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fog">
      {label}
      {plain ? null : optional ? (
        <span className="text-xs font-normal text-mute">Optional</span>
      ) : (
        <span className="text-danger" aria-hidden>
          *
        </span>
      )}
    </span>
  );
}

function FieldShell({
  label,
  error,
  optional,
  plain,
  hint,
  children,
}: FieldShellProps & { children: ReactNode }) {
  return (
    <label className="block">
      <FieldLabel label={label} optional={optional} plain={plain} />
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-mute">{hint}</span>
      ) : null}
    </label>
  );
}

type TextFieldProps = FieldShellProps &
  InputHTMLAttributes<HTMLInputElement> & {
    icon: IconSvgElement;
  };

export function TextField({
  label,
  error,
  optional,
  hint,
  icon,
  className,
  ...props
}: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} optional={optional} hint={hint}>
      <span className="relative block">
        <HugeiconsIcon
          icon={icon}
          size={18}
          color="currentColor"
          strokeWidth={1.7}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mute"
        />
        <input className={cn('field-input', error && 'border-danger/70', className)} {...props} />
      </span>
    </FieldShell>
  );
}

type SelectOption = { value: string; label: string } | string;

type SelectFieldProps = FieldShellProps & {
  icon: IconSvgElement;
  placeholder?: string;
  options: ReadonlyArray<SelectOption>;
  value?: string;
  name?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
  onBlur?: () => void;
  onChange?: (event: { target: { name?: string; value: string } }) => void;
};

function toOption(option: SelectOption): { value: string; label: string } {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

export function SelectField({
  label,
  error,
  optional,
  plain,
  hint,
  icon,
  placeholder = 'Select',
  options,
  className,
  value = '',
  name,
  disabled,
  hideLabel,
  onChange,
  onBlur,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState({ placement: 'bottom' as 'top' | 'bottom', maxHeight: 224 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const items = useMemo(() => options.map(toOption), [options]);
  const selected = items.find((item) => item.value === value);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 16;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const preferred = 224;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      setMenu({
        placement: openUp ? 'top' : 'bottom',
        maxHeight: Math.max(120, Math.min(preferred, openUp ? spaceAbove - 8 : spaceBelow)),
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const selectValue = (next: string) => {
    onChange?.({ target: { name, value: next } });
    setOpen(false);
    onBlur?.();
  };

  return (
    <div className="block" ref={rootRef}>
      {hideLabel ? null : <FieldLabel label={label} optional={optional} plain={plain} />}
      <div className="relative">
        <HugeiconsIcon
          icon={icon}
          size={18}
          color="currentColor"
          strokeWidth={1.7}
          className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-mute"
        />
        <button
          ref={buttonRef}
          type="button"
          name={name}
          disabled={disabled}
          onBlur={onBlur}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'field-input relative flex items-center pr-11 text-left',
            !selected && 'text-mute',
            open && 'border-primary shadow-[0_0_0_4px_rgba(17,24,39,0.08)]',
            error && 'border-danger/70',
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            color="currentColor"
            strokeWidth={1.8}
            className={cn(
              'pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-mute transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>

        {open ? (
          <ul
            role="listbox"
            style={{ maxHeight: menu.maxHeight }}
            className={cn(
              'dropdown-list absolute z-50 w-full overflow-auto rounded-2xl border border-line bg-card py-1.5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]',
              menu.placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            )}
          >
            {items.map((item) => {
              const isSelected = item.value === value;
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectValue(item.value)}
                    className={cn(
                      'flex w-full items-center px-4 py-2.5 text-left text-sm transition',
                      isSelected
                        ? 'bg-primary font-semibold text-white'
                        : 'text-fog hover:bg-primary/8 hover:text-ink'
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-mute">{hint}</span>
      ) : null}
    </div>
  );
}

type PasswordFieldProps = FieldShellProps &
  InputHTMLAttributes<HTMLInputElement> & {
    icon: IconSvgElement;
    visible: boolean;
    onToggle: () => void;
    eyeIcon: IconSvgElement;
    eyeOffIcon: IconSvgElement;
  };

export function PasswordField({
  label,
  error,
  optional,
  hint,
  icon,
  visible,
  onToggle,
  eyeIcon,
  eyeOffIcon,
  className,
  ...props
}: PasswordFieldProps) {
  return (
    <FieldShell label={label} error={error} optional={optional} hint={hint}>
      <span className="relative block">
        <HugeiconsIcon
          icon={icon}
          size={18}
          color="currentColor"
          strokeWidth={1.7}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mute"
        />
        <input
          type={visible ? 'text' : 'password'}
          className={cn('field-input pr-12', error && 'border-danger/70', className)}
          {...props}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-mute transition hover:text-primary"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <HugeiconsIcon
            icon={visible ? eyeOffIcon : eyeIcon}
            size={18}
            color="currentColor"
            strokeWidth={1.7}
          />
        </button>
      </span>
    </FieldShell>
  );
}
