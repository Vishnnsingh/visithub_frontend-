import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon, Cancel01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${pad(minutes)} ${suffix}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${pad(hours)}:${pad(minutes)}`;
  return { value, label: formatTime(value) };
});

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type PickerProps = {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fog">
      {label}
      {required ? <span className="text-danger">*</span> : null}
    </span>
  );
}

function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : trimmed;
  }
  const parts = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!parts) return null;
  const iso = `${parts[3]}-${pad(Number(parts[2]))}-${pad(Number(parts[1]))}`;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== Number(parts[3]) || date.getMonth() + 1 !== Number(parts[2]) || date.getDate() !== Number(parts[1])) {
    return null;
  }
  return iso;
}

function useMenuBox(open: boolean, buttonRef: RefObject<HTMLElement | null>, preferred = 280) {
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, maxHeight: 240, placement: 'bottom' as 'top' | 'bottom' });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 16;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
      setBox({
        left: rect.left,
        width: rect.width,
        maxHeight: Math.max(200, Math.min(preferred, openUp ? spaceAbove : spaceBelow)),
        placement: openUp ? 'top' : 'bottom',
        top: openUp ? rect.top : rect.bottom,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, buttonRef, preferred]);

  return box;
}

function Trigger({
  icon,
  open,
  placeholder,
  text,
  buttonRef,
  onClick,
}: {
  icon: IconSvgElement;
  open: boolean;
  placeholder: string;
  text: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}) {
  return (
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
        onClick={onClick}
        className={cn(
          'field-input relative flex w-full items-center pr-11 text-left',
          !text && 'text-mute',
          open && 'border-primary shadow-[0_0_0_4px_rgba(17,24,39,0.08)]'
        )}
      >
        <span className="truncate">{text || placeholder}</span>
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
    </div>
  );
}

function MenuPortal({
  open,
  box,
  menuRef,
  children,
}: {
  open: boolean;
  box: ReturnType<typeof useMenuBox>;
  menuRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  if (!open || typeof document === 'undefined') return null;
  const style: CSSProperties =
    box.placement === 'top'
      ? { bottom: window.innerHeight - box.top + 8, left: box.left, width: box.width, maxHeight: box.maxHeight }
      : { top: box.top + 8, left: box.left, width: box.width, maxHeight: box.maxHeight };

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className="dropdown-list fixed z-90 overflow-auto rounded-2xl border border-line bg-card py-1.5 shadow-[0_16px_40px_rgba(17,24,39,0.10)]"
    >
      {children}
    </div>,
    document.body
  );
}

export function DatePickerField({ label, required, value, onChange, placeholder = 'Select date' }: PickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ? formatDate(value) : '');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const box = useMenuBox(open, inputRef, 360);
  const selected = value ? new Date(`${value}T00:00:00`) : new Date();
  const [cursor, setCursor] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    if (editing) return;
    setDraft(value ? formatDate(value) : '');
    if (value) setCursor(new Date(`${value}T00:00:00`));
  }, [value, editing]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = first.getDay();
    const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < start; i += 1) cells.push({ day: null, iso: null });
    for (let day = 1; day <= count; day += 1) {
      cells.push({
        day,
        iso: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(day)}`,
      });
    }
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const calendarBox = { ...box, width: Math.max(box.width, 300), maxHeight: Math.max(box.maxHeight, 320) };

  const applyDate = (next: string) => {
    onChange(next);
    setEditing(false);
    setDraft(next ? formatDate(next) : '');
    if (next) setCursor(new Date(`${next}T00:00:00`));
  };

  return (
    <div ref={rootRef}>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <button
          type="button"
          className="absolute top-1/2 left-3 z-10 -translate-y-1/2 text-mute hover:text-primary"
          aria-label="Open calendar"
          onClick={() => setOpen((current) => !current)}
        >
          <HugeiconsIcon icon={Calendar03Icon} size={18} color="currentColor" strokeWidth={1.7} />
        </button>
        <input
          ref={inputRef}
          className={cn('field-input pr-11', open && 'border-primary shadow-[0_0_0_4px_rgba(17,24,39,0.08)]')}
          placeholder={placeholder}
          value={draft}
          onFocus={() => {
            setEditing(true);
            setOpen(true);
          }}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const parsed = parseDateInput(next);
            if (parsed === '') onChange('');
            if (parsed) {
              onChange(parsed);
              setCursor(new Date(`${parsed}T00:00:00`));
            }
          }}
          onBlur={() => {
            setEditing(false);
            const parsed = parseDateInput(draft);
            if (parsed === '') {
              applyDate('');
              return;
            }
            if (parsed) {
              setDraft(formatDate(parsed));
              return;
            }
            setDraft(value ? formatDate(value) : '');
          }}
        />
        {value ? (
          <button
            type="button"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-mute hover:text-primary"
            aria-label="Clear date"
            onClick={() => {
              applyDate('');
              setOpen(false);
            }}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
      <MenuPortal open={open} box={calendarBox} menuRef={menuRef}>
        <div className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="grid size-8 place-items-center rounded-full text-fog hover:bg-bg"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color="currentColor" strokeWidth={1.8} />
            </button>
            <p className="text-sm font-semibold text-ink">{monthLabel}</p>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-full text-fog hover:bg-bg"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" strokeWidth={1.8} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-center text-[11px] font-semibold text-mute">
                {day}
              </span>
            ))}
            {days.map((cell, index) =>
              cell.day ? (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    applyDate(cell.iso as string);
                    setOpen(false);
                  }}
                  className={cn(
                    'grid aspect-square place-items-center rounded-full text-xs font-medium',
                    cell.iso === value ? 'bg-primary text-white' : 'text-fog hover:bg-secondary/15 hover:text-ink'
                  )}
                >
                  {cell.day}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              )
            )}
          </div>
        </div>
      </MenuPortal>
    </div>
  );
}

export function TimePickerField({ label, required, value, onChange }: PickerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const box = useMenuBox(open, buttonRef);
  const selected = TIME_OPTIONS.find((item) => item.value === value);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
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
    if (!open || !value) return;
    const node = menuRef.current?.querySelector(`[data-time="${value}"]`);
    if (node instanceof HTMLElement) node.scrollIntoView({ block: 'center' });
  }, [open, value]);

  return (
    <div ref={rootRef}>
      <FieldLabel label={label} required={required} />
      <Trigger
        icon={Clock01Icon}
        open={open}
        placeholder="Select time"
        text={selected?.label || (value ? formatTime(value) : '')}
        buttonRef={buttonRef}
        onClick={() => setOpen((current) => !current)}
      />
      <MenuPortal open={open} box={box} menuRef={menuRef}>
        {TIME_OPTIONS.map((item) => {
          const isSelected = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              data-time={item.value}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center px-4 py-2.5 text-left text-sm transition',
                isSelected ? 'bg-primary/10 font-medium text-primary' : 'text-fog hover:bg-secondary/15 hover:text-ink'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </MenuPortal>
    </div>
  );
}
