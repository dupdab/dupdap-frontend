'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from '@/lib/toast';
import { webhooksApi } from '@/lib/api';
import { WEBHOOK_EVENTS, formatDate, maskSecret } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Webhook } from '@/lib/types';

interface WebhookDelivery {
  id: string;
  eventType: string;
  status: 'delivered' | 'failed';
  responseCode: number | null;
  createdAt: string;
}

const DELIVERIES_PER_PAGE = 50;

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
// Per-webhook delivery log — shows the last 50 deliveries with pagination and
// filtering by event type / status, plus a retry action for failed deliveries.
// ---------------------------------------------------------------------------

interface WebhookDeliveryLogProps {
  webhookId: string;
}

function WebhookDeliveryLog({ webhookId }: WebhookDeliveryLogProps) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await webhooksApi.deliveries(webhookId);
      setDeliveries(data);
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to load delivery log');
    } finally {
      setLoading(false);
    }
  }, [webhookId]);

  useEffect(() => { load(); }, [load]);

  const filtered = deliveries.filter((d) => {
    if (eventFilter && d.eventType !== eventFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / DELIVERIES_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * DELIVERIES_PER_PAGE,
    currentPage * DELIVERIES_PER_PAGE + DELIVERIES_PER_PAGE,
  );

  const retry = async (id: string) => {
    setRetryingId(id);
    try {
      await webhooksApi.retryDelivery(webhookId, id);
      toast.success('Delivery retried');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err) ?? 'Failed to retry delivery');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4" data-testid={`delivery-log-${webhookId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-gray-600">Delivery log</p>
        <div className="flex items-center gap-2">
          <select
            data-testid={`delivery-event-filter-${webhookId}`}
            value={eventFilter}
            onChange={(e) => { setEventFilter(e.target.value); setPage(0); }}
            className="input text-xs py-1"
            aria-label="Filter deliveries by event type"
          >
            <option value="">All events</option>
            {WEBHOOK_EVENTS.map((e: string) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select
            data-testid={`delivery-status-filter-${webhookId}`}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="input text-xs py-1"
            aria-label="Filter deliveries by status"
          >
            <option value="">All statuses</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Loading deliveries…</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No deliveries found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1 pr-3 font-medium">Timestamp</th>
                <th className="py-1 pr-3 font-medium">Event</th>
                <th className="py-1 pr-3 font-medium">Status</th>
                <th className="py-1 pr-3 font-medium">Response</th>
                <th className="py-1 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.id} data-testid={`delivery-row-${d.id}`} className="border-t border-gray-100">
                  <td className="py-1 pr-3 text-gray-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                  <td className="py-1 pr-3 font-mono">{d.eventType}</td>
                  <td className="py-1 pr-3">
                    <span className={d.status === 'delivered' ? 'text-green-600' : 'text-red-600'}>
                      {d.status === 'delivered' ? 'Delivered' : 'Failed'}
                    </span>
                  </td>
                  <td className="py-1 pr-3 text-gray-500">{d.responseCode ?? '—'}</td>
                  <td className="py-1">
                    {d.status === 'failed' && (
                      <button
                        type="button"
                        data-testid={`retry-delivery-${d.id}`}
                        onClick={() => retry(d.id)}
                        disabled={retryingId === d.id}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="button"
            data-testid={`delivery-prev-${webhookId}`}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Previous deliveries page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500">Page {currentPage + 1} of {pageCount}</span>
          <button
            type="button"
            data-testid={`delivery-next-${webhookId}`}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Next deliveries page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
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
        <WebhookDeliveryLog webhookId={w.id} />
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
          {/* Visually hidden submit keeps Enter-to-submit working */}
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
          <div>
            <label className="label">Endpoint URL</label>
            <input
              data-testid="webhook-url-input"
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com/webhooks"
              className="input"
            />
          </div>
          <div>
            <label className="label">Events</label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((e: string) => (
                <label key={e} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.events.includes(e)}
                    onChange={() => toggleEvent(e)}
                  />
                  {e}
                </label>
              ))}
            </div>
            {formError && <p className="text-xs text-red-600 mt-1">{formError}</p>}
          </div>
          <div>
            <label className="label">Signing secret (optional)</label>
            <div className="flex items-center gap-2">
              <input
                data-testid="webhook-secret-input"
                type={secretRevealed ? 'text' : 'password'}
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                placeholder="Leave blank to auto-generate"
                className="input"
              />
              <button
                type="button"
                onClick={() => setSecretRevealed((v) => !v)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={secretRevealed ? 'Hide signing secret' : 'Show signing secret'}
              >
                {secretRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeCreateModal} className="btn-secondary">Cancel</button>
            <button data-testid="create-webhook-submit" type="submit" disabled={creating} className="btn-primary">
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
          <div className="card p-8 text-center text-gray-400">
            No webhooks yet. Add one to start receiving events.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && remove(deletingId)}
        title="Delete webhook"
        message="This webhook will stop receiving events. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
