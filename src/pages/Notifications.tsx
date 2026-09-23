import { Notification01Icon, VolumeHighIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';
import { DashboardShell } from '../components/layout/DashboardShell';
import { SelectField } from '../components/ui/Fields';
import { cn } from '../lib/cn';
import {
  previewSound,
  readNotifySettings,
  SOUND_LIBRARY,
  subscribeNotify,
  writeNotifySettings,
} from '../lib/notifyStore';

export function Notifications() {
  const [settings, setSettings] = useState(() => readNotifySettings());

  useEffect(() => subscribeNotify(() => setSettings(readNotifySettings())), []);

  return (
    <DashboardShell title="Notifications" subtitle="Turn alert sounds on or off, then pick a library sound.">
      <div className="mx-auto max-w-xl space-y-4">
        <article className="rounded-3xl border border-line bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Alerts</p>
              <p className="mt-1 text-xs text-mute">Turn sounds on or off, then pick a library sound.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              onClick={() => setSettings(writeNotifySettings({ enabled: !settings.enabled }))}
              className={cn('relative h-6 w-11 shrink-0 rounded-full transition', settings.enabled ? 'bg-primary' : 'bg-line')}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left]',
                  settings.enabled ? 'left-5' : 'left-0.5'
                )}
              />
            </button>
          </div>
        </article>

        <article className="rounded-3xl border border-line bg-card p-5">
          <SoundPick
            label="New visitor"
            value={settings.inSound}
            onChange={(inSound) => setSettings(writeNotifySettings({ inSound }))}
          />
          <div className="mt-4">
            <SoundPick
              label="Visitor out"
              value={settings.outSound}
              onChange={(outSound) => setSettings(writeNotifySettings({ outSound }))}
            />
          </div>
          <div className="mt-4">
            <SoundPick
              label="Countdown ended"
              value={settings.countdownSound}
              onChange={(countdownSound) => setSettings(writeNotifySettings({ countdownSound }))}
            />
          </div>
        </article>
      </div>
    </DashboardShell>
  );
}

function SoundPick({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => previewSound(value)}
        className="absolute top-0 right-0 z-10 text-mute hover:text-primary"
        aria-label={`Preview ${label}`}
      >
        <HugeiconsIcon icon={VolumeHighIcon} size={16} color="currentColor" strokeWidth={1.8} />
      </button>
      <SelectField
        label={label}
        icon={Notification01Icon}
        plain
        value={value}
        options={SOUND_LIBRARY.map((item) => ({ value: item.id, label: item.label }))}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
