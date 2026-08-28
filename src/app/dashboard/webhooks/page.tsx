'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { webhooksApi } from '@/lib/api';
import { WEBHOOK_EVENTS, formatDate } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: '', events: [] as string[] });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => webhooksApi.list().then(({ data }) => setWebhooks(data));

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.events.length === 0) {
      setFormError('Select at least one event');
      toast.error('Select at least one event');
      return;
    }
    setFormError('');
    setCreating(true);
    try {
      await webhooksApi.create(form);
      toast.success('Webhook created');
      setShowCreate(false);
      setForm({ url: '', events: [] });
      load();
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to create webhook');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    setDeleting(true);
    try {
      await webhooksApi.remove(id);
      toast.success('Webhook removed');
      setDeletingId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to remove webhook');
    } finally {
      setDeleting(false);
    }
  };

  const toggleEvent = (e: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(e) ? f.events.filter((x) => x !== e) : [...f.events, e],
    }));
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setForm({ url: '', events: [] });
    setFormError('');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">Get notified when payment events occur</p>
        </div>
        <button data-testid="new-webhook-button" onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      <Modal
        open={showCreate}
        onClose={closeCreateModal}
        title="New Webhook"
        testId="create-webhook-modal"
      >
        <form onSubmit={create} className="space-y-4">
          {formError && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {formError}
            </p>
          )}
          <fieldset disabled={creating} className="space-y-4">
            <div>
              <label htmlFor="webhook-url" className="label">Endpoint URL</label>
              <input
                id="webhook-url"
                className="input"
                type="url"
                required
                placeholder="https://your-server.com/webhook"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <fieldset>
              <legend className="label mb-1">Events</legend>
              <div className="space-y-2 mt-1">
                {WEBHOOK_EVENTS.map((evt) => {
                  const id = `webhook-event-${evt}`;
                  return (
                    <div key={evt} className="flex items-center gap-2">
                      <input
                        id={id}
                        type="checkbox"
                        checked={form.events.includes(evt)}
                        onChange={() => toggleEvent(evt)}
                      />
                      <label htmlFor={id} className="text-sm cursor-pointer">
                        <code className="text-xs">{evt}</code>
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
            <button data-testid="webhook-submit-button" type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? 'Creating...' : 'Create Webhook'}
            </button>
          </fieldset>
        </form>
      </Modal>

      <div className="space-y-3">
        {webhooks.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">No webhooks configured</div>
        ) : (
          webhooks.map((w) => (
            <div key={w.id} data-testid={`webhook-row-${w.id}`} className="card p-5 flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-medium break-all">{w.url}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {w.events.map((e: string) => (
                    <span key={e} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{e}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Created {formatDate(w.createdAt)}</p>
              </div>
              <button
                data-testid={`delete-webhook-${w.id}`}
                onClick={() => setDeletingId(w.id)}
                className="text-red-400 hover:text-red-600 ml-4"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete webhook?"
        message="This will permanently remove the webhook and stop all future event notifications. This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={() => deletingId && remove(deletingId)}
        onCancel={() => !deleting && setDeletingId(null)}
      />
    </div>
  );
}
