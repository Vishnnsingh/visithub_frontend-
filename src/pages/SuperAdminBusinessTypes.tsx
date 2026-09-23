import { Add01Icon, Delete02Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { DashboardShell } from '../components/layout/DashboardShell';
import { api, getApiErrorMessage } from '../lib/api';

type BusinessTypesPayload = { types: string[] };

type ConfirmState =
  | { kind: 'all' }
  | { kind: 'one'; name: string }
  | null;

export function SuperAdminBusinessTypes() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editName, setEditName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const typesQuery = useQuery({
    queryKey: ['admin-business-types'],
    queryFn: async () => {
      const response = await api.get('/business-types/admin');
      return response.data.data as BusinessTypesPayload;
    },
  });

  const invalidateRelated = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-business-types'] });
    void queryClient.invalidateQueries({ queryKey: ['business-types'] });
    void queryClient.invalidateQueries({ queryKey: ['business-type-pricing'] });
  };

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/business-types/admin', { name });
      return response.data.data as BusinessTypesPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-business-types'], data);
      invalidateRelated();
      toast.success('Business type added');
      setShowAdd(false);
      setNameInput('');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not add')),
  });

  const editMutation = useMutation({
    mutationFn: async ({ oldName, name }: { oldName: string; name: string }) => {
      const response = await api.put('/business-types/admin', { oldName, name });
      return response.data.data as BusinessTypesPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-business-types'], data);
      invalidateRelated();
      toast.success('Business type updated');
      setEditName(null);
      setNameInput('');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not update')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.delete('/business-types/admin', { data: { name } });
      return response.data.data as BusinessTypesPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-business-types'], data);
      invalidateRelated();
      toast.success('Business type deleted');
      setConfirm(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not delete')),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/business-types/admin/all');
      return response.data.data as BusinessTypesPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-business-types'], data);
      invalidateRelated();
      toast.success('All business types removed');
      setConfirm(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not clear')),
  });

  const types = typesQuery.data?.types || [];

  const openAdd = () => {
    setConfirm(null);
    setEditName(null);
    setNameInput('');
    setShowAdd(true);
  };

  const openEdit = (name: string) => {
    setConfirm(null);
    setShowAdd(false);
    setEditName(name);
    setNameInput(name);
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditName(null);
    setNameInput('');
  };

  const submitModal = () => {
    const name = nameInput.trim();
    if (!name) {
      toast.error('Enter a business type name');
      return;
    }
    if (editName) {
      editMutation.mutate({ oldName: editName, name });
    } else {
      addMutation.mutate(name);
    }
  };

  const confirmBusy = deleteMutation.isPending || clearAllMutation.isPending;

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === 'all') clearAllMutation.mutate();
    else deleteMutation.mutate(confirm.name);
  };

  const modalOpen = showAdd || editName != null;
  const saving = addMutation.isPending || editMutation.isPending;

  return (
    <DashboardShell
      title="Business types"
      subtitle="Add, edit, or delete types shown on organisation signup and plan pricing."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fog">{types.length} type{types.length === 1 ? '' : 's'}</p>
        <div className="flex flex-wrap gap-2">
          {types.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirm({ kind: 'all' })}
              disabled={clearAllMutation.isPending}
              className="rounded-full border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
            >
              Delete all
            </button>
          ) : null}
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep"
          >
            <HugeiconsIcon icon={Add01Icon} size={16} color="currentColor" strokeWidth={1.8} />
            Add business type
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
        {typesQuery.isLoading ? (
          <p className="p-6 text-sm text-mute">Loading…</p>
        ) : typesQuery.error ? (
          <p className="p-6 text-sm text-danger">{getApiErrorMessage(typesQuery.error)}</p>
        ) : types.length === 0 ? (
          <p className="p-6 text-sm text-mute">No business types yet. Click Add business type.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-bg text-xs tracking-wide text-mute uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Business type</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type, index) => (
                <tr key={type} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-mute">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-ink">{type}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(type)}
                        className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                      >
                        <HugeiconsIcon
                          icon={PencilEdit02Icon}
                          size={14}
                          color="currentColor"
                          strokeWidth={1.8}
                        />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: 'one', name: type })}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-full border border-danger/25 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          size={14}
                          color="currentColor"
                          strokeWidth={1.8}
                        />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
              onClick={closeModal}
            >
              <div
                className="w-full max-w-md rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-ink">
                    {editName ? 'Edit business type' : 'Add business type'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
                <label className="mt-5 block text-sm font-medium text-ink">
                  Name
                  <input
                    autoFocus
                    className="field-input mt-1.5"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitModal();
                      }
                    }}
                    placeholder="e.g. School"
                    maxLength={80}
                  />
                </label>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitModal}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : editName ? 'Save changes' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {confirm
        ? createPortal(
            <div
              className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4"
              onClick={() => !confirmBusy && setConfirm(null)}
            >
              <div
                className="w-full max-w-md rounded-3xl border border-line bg-card p-5 shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-ink">
                      {confirm.kind === 'all' ? 'Delete all business types?' : 'Delete business type?'}
                    </h3>
                    <p className="mt-2 text-sm text-fog">
                      {confirm.kind === 'all'
                        ? 'Signup will have no types until you add new ones.'
                        : (
                          <>
                            Delete “<span className="font-semibold text-ink">{confirm.name}</span>”?
                            This cannot be undone.
                          </>
                          )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={confirmBusy}
                    onClick={() => setConfirm(null)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-bg disabled:opacity-60"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={confirmBusy}
                    onClick={runConfirm}
                    className="rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {confirmBusy
                      ? 'Deleting…'
                      : confirm.kind === 'all'
                        ? 'Delete all'
                        : 'Delete'}
                  </button>
                  <button
                    type="button"
                    disabled={confirmBusy}
                    onClick={() => setConfirm(null)}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg disabled:opacity-60"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </DashboardShell>
  );
}
