'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from '@/lib/toast';
import { webhooksApi } from '@/lib/api';
import { WEBHOOK_EVENTS, formatDate, maskSecret } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Webhook } from '@/lib/types';

function WebhookSecretRow({ webhook, onRotated }: { webhook: Webhook; onRotated: (secret: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  if (!webhook.secret) return null;

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(webhook.secret!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy secret');
    }
  };

  const rotate = async () => {
    setRotating(true);
    try {
      const { data } = await webhooksApi.rotateSecret(webhook.id);
      if (data.secret) {
        onRotated(data.secret);
        setRevealed(true);
        toast.success('Signing secret rotated');
      } else {
        toast.success('Signing secret rotated');
      }
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to rotate signing secret');
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs text-gray-500">Signing secret</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`reveal-secret-${webhook.id}`}
            onClick={() => setRevealed((value) => !value)}
            className="text-gray-400 hover:text-gray-600"
            aria-label={revealed ? 'Hide signing secret' : 'Show signing secret'}
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            type="button"
            data-testid={`copy-secret-${webhook.id}`}
            onClick={copySecret}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Copy signing secret"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            data-testid={`rotate-secret-${webhook.id}`}
            onClick={rotate}
            disabled={rotating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Rotate signing secret"
          >
            <RefreshCw className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <code className="text-xs font-mono break-all">
        {revealed ? webhook.secret : maskSecret(webhook.secret)}
      </code>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memoized row component — avoids re-rendering existing webhook cards when
// the create modal opens/closes or the deletion confirmation dialog is shown.
// ---------------------------------------------------------------------------

interface WebhookRowProps {
  webhook: Webhook;
  onDelete: (id: string) => void;
  onSecretRotated: (id: string, secret: string) => void;
}

const WebhookRow = memo(function WebhookRow({ webhook: w, onDelete, onSecretRotated }: WebhookRowProps) {
  return (
    <div data-testid={`webhook-row-${w.id}`} className="card p-5 flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm font-medium break-all">{w.url}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {w.events.map((e: string) => (
            <span key={e} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{e}</span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Created {formatDate(w.createdAt)}</p>
        <WebhookSecretRow
          webhook={w}
          onRotated={(secret) => onSecretRotated(w.id, secret)}
        />
      </div>
      <button
        data-testid={`delete-webhook-${w.id}`}
        onClick={() => onDelete(w.id)}
        aria-label={`Delete webhook ${w.url}`}
        className="text-red-400 hover:text-red-600 ml-4"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: '', events: [] as string[], secret: '' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [secretRevealed, setSecretRevealed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await webhooksApi.list();
      setWebhooks(data);
    } catch (err) {
      setLoadError(getErrorMessage(err) ?? 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      const payload = {
        url: form.url,
        events: form.events,
        ...(form.secret.trim() ? { secret: form.secret.trim() } : {}),
      };
      const { data } = await webhooksApi.create(payload);
      toast.success('Webhook created');
      setShowCreate(false);
      setForm({ url: '', events: [], secret: '' });
      if (data.secret) {
        setWebhooks((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      } else {
        load();
      }
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to create webhook');
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
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to remove webhook');
    } finally {
      setDeleting(false);
    }
  };

  const toggleEvent = (e: string) => {
    setForm((f) => {
      const nextEvents = f.events.includes(e) ? f.events.filter((x) => x !== e) : [...f.events, e];
      if (nextEvents.length > 0) {
        setFormError('');
      }
      return {
        ...f,
        events: nextEvents,
      };
    });
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setForm({ url: '', events: [], secret: '' });
    setSecretRevealed(false);
    setFormError('');
  };

  const updateWebhookSecret = useCallback((id: string, secret: string) => {
    setWebhooks((current) => current.map((webhook) => (
      webhook.id === id ? { ...webhook, secret } : webhook
    )));
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-1">Get notified when payment events occur</p>
        </div>
        <button data-testid="new-webhook-button" onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {loading ? (
        <div data-testid="webhooks-loading" className="card p-8 text-center text-sm text-gray-500">
          Loading webhooks…
        </div>
      ) : loadError ? (
        <div data-testid="webhooks-error" className="card p-8 text-center">
          <p className="text-sm text-red-600 mb-3">{loadError}</p>
          <button onClick={load} className="btn-secondary">Retry</button>
        </div>
      ) : webhooks.length === 0 ? (
        <div data-testid="webhooks-empty" className="card p-8 text-center text-sm text-gray-500">
          No webhooks yet. Add one to start receiving event notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <WebhookRow
              key={w.id}
              webhook={w}
              onDelete={setDeletingId}
              onSecretRotated={updateWebhookSecret}
            />
          ))}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={closeCreateModal}
        title="New Webhook"
        testId="create-webhook-modal"
      >
        <form onSubmit={create} className="space-y-4" aria-busy={creating}>
          <div>
            <label htmlFor="webhook-url" className="label">Endpoint URL</label>
            <input
              id="webhook-url"
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com/webhooks"
              className="input font-mono"
            />
          </div>

          <div>
            <p className="label">Events</p>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  <span className="font-mono text-xs">{event}</span>
                </label>
              ))}
            </div>
            {formError && <p className="text-xs text-red-600 mt-1">{formError}</p>}
          </div>

          <div>
            <label htmlFor="webhook-secret" className="label">Signing secret (optional)</label>
            <div className="relative">
              <input
                id="webhook-secret"
                type={secretRevealed ? 'text' : 'password'}
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder="Leave blank to auto-generate"
                className="input font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setSecretRevealed((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={secretRevealed ? 'Hide secret' : 'Show secret'}
              >
                {secretRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeCreateModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete webhook?"
        description="This webhook will stop receiving event notifications."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => deletingId && remove(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
