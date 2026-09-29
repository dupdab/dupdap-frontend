'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from '@/lib/toast';
import { webhooksApi } from '@/lib/api';
import { WEBHOOK_EVENTS, formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Webhook } from '@/lib/types';

function maskSecret(secret: string) {
  if (secret.length <= 8) return '••••••••';
  return `${secret.slice(0, 4)}${'•'.repeat(Math.min(secret.length - 8, 16))}${secret.slice(-4)}`;
}

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
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ url: '', events: [] as string[], secret: '' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [secretRevealed, setSecretRevealed] = useState(false);

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
        <form onSubmit={create} className="space-y-4" aria-busy={creating}>
          {/* Visually-hidden live region announces submit outcomes to screen readers (#158) */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {creating ? 'Creating webhook, please wait…' : ''}
          </p>
          <fieldset disabled={creating} className="space-y-4">
            <div>
              <label htmlFor="webhook-url" className="label">
                Endpoint URL
              </label>
              <input
                id="webhook-url"
                data-testid="webhook-url-input"
                type="url"
                required
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/webhooks"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="webhook-secret" className="label">
                Signing secret <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="webhook-secret"
                  data-testid="webhook-secret-input"
                  /* Masked by default so the HMAC secret is never shown in
                     cleartext while it is typed; revealed on explicit request. */
                  type={secretRevealed ? 'text' : 'password'}
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  placeholder="whsec_…"
                  className="input font-mono"
                />
                <button
                  type="button"
                  data-testid="toggle-webhook-secret"
                  onClick={() => setSecretRevealed((value) => !value)}
                  aria-pressed={secretRevealed}
                  aria-label={secretRevealed ? 'Hide signing secret' : 'Show signing secret'}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  {secretRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* Nested fieldset/legend gives screen readers a programmatic group
                name for the event checkboxes (#347). */}
            <fieldset data-testid="webhook-events-fieldset">
              <legend className="label">Events</legend>
              <div className="space-y-2 mt-1">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      data-testid={`event-checkbox-${event}`}
                      checked={form.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded border-gray-300"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </fieldset>
            {formError && (
              <p
                data-testid="webhook-events-error"
                role="alert"
                className="text-xs text-red-500"
              >
                {formError}
              </p>
            )}
            <button data-testid="webhook-submit-button" type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? 'Creating...' : 'Create Webhook'}
            </button>
          </fieldset>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeCreateModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" data-testid="create-webhook-submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="space-y-3">
        {webhooks.map((w) => (
          <WebhookRow
            key={w.id}
            webhook={w}
            onDelete={setDeletingId}
            onSecretRotated={updateWebhookSecret}
          />
        ))}
        {webhooks.length === 0 && (
          <div className="card p-12 text-center text-gray-400">
            <p>No webhooks configured. Add one to start receiving events.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => deletingId && remove(deletingId)}
        title="Delete webhook?"
        message="This webhook will stop receiving events. This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
