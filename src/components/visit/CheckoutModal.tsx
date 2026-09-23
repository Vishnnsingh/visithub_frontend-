import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '../../lib/api';
import { CenteredOverlay } from './CenteredOverlay';

type Gate = { label: string; publicCode: string };
type Visitor = {
  id: string;
  date: string | null;
  inTime: string | null;
  outTime: string | null;
  label: string;
};

export function CheckoutModal({
  code,
  visitor,
  gates,
  indiaDate,
  indiaInTime,
  onSuccess,
}: {
  code: string;
  visitor: Visitor;
  gates: Gate[];
  indiaDate: string;
  indiaInTime: string;
  onSuccess: (visitor: Visitor) => void;
}) {
  const [outGate, setOutGate] = useState(gates.length === 1 ? gates[0].publicCode : code);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/qr/visit/${code}/out/${visitor.id}`, { outPublicCode: outGate });
      return response.data.data.visitor as Visitor;
    },
    onSuccess,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not save out time')),
  });

  return (
    <CenteredOverlay>
      <form
        className="mx-auto w-full max-w-lg rounded-3xl bg-card p-5 shadow-lg"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <h2 className="text-lg font-semibold text-ink">Out time</h2>
        <p className="mt-1 text-sm text-mute">Select the gate you are leaving from. Date and out time fill automatically.</p>
        {gates.length > 1 ? (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-fog">Out gate</span>
            <select
              className="field-input !pl-4"
              value={outGate}
              onChange={(event) => setOutGate(event.target.value)}
            >
              {gates.map((gate) => (
                <option key={gate.publicCode} value={gate.publicCode}>
                  {gate.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mt-4 rounded-2xl bg-bg px-4 py-3 text-sm text-fog">Out gate: {gates[0]?.label || visitor.label}</p>
        )}
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-medium text-fog">Date</span>
          <input className="field-input pointer-events-none cursor-default bg-bg !pl-4" value={formatDate(indiaDate)} readOnly />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-medium text-fog">Out time</span>
          <input className="field-input pointer-events-none cursor-default bg-bg !pl-4" value={formatTime(indiaInTime)} readOnly />
        </label>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving...' : 'Submit out time'}
        </button>
      </form>
    </CenteredOverlay>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
