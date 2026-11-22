'use client';

import {
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';

import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { SkeletonList } from '@/components/Skeleton';
import { webhooksApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import toast from '@/lib/toast';
import type { Webhook, WebhookDelivery } from '@/lib/types';
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_DETAILS,
  formatDate,
  maskSecret,
} from '@/lib/utils';

// ---------------------------------------------------------------------------
// Delivery log panel (#788) — paginated delivery history for one webhook,
// most recent first.
// ---------------------------------------------------------------------------

const DELIVERIES_PAGE_SIZE = 10;
const RESPONSE_PREVIEW_LENGTH = 120;

function previewBody(body?: string | null): string {
  if (!body) return '—';
  return body.length > RESPONSE_PREVIEW_LENGTH
    ? `${body.slice(0, RESPONSE_PREVIEW_LENGTH)}…`
    : body;
}

function statusClass(code: number | null): string {
  if (code === null) return 'text-gray-500';
  return code >= 200 && code < 300 ? 'text-green-600' : 'text-red-600';
}

function WebhookDeliveriesPanel({ webhook }: { webhook: Webhook }) {
  const [page, setPage] = useState(1);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    webhooksApi
      .deliveries(webhook.id, page, DELIVERIES_PAGE_SIZE)
      .then(({ data }) => {
        if (cancelled) return;
        const sorted = [...(data.deliveries ?? [])].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setDeliveries(sorted);
        setTotal(data.total ?? sorted.length);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err) ?? 'Failed to load deliveries');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [webhook.id, page]);

  const totalPages = Math.max(1, Math.ceil(total / DELIVERIES_PAGE_SIZE));

  return (
    <div data-testid={`webhook-deliveries-${webhook.id}`} className="space-y-3">
      <p className="text-xs font-mono text-gray-500 break-all">{webhook.url}</p>
      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-gray-500">No deliveries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th scope="col" className="py-1 pr-3">Timestamp</th>
                <th scope="col" className="py-1 pr-3">Event</th>
                <th scope="col" className="py-1 pr-3">HTTP status</th>
                <th scope="col" className="py-1 pr-3">Response time</th>
                <th scope="col" className="py-1">Response body</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deliveries.map((d) => (
                <tr key={d.id} data-testid="webhook-delivery-row">
                  <td className="py-1 pr-3 whitespace-nowrap">
                    {formatDate(d.createdAt)}
                  </td>
                  <td className="py-1 pr-3 font-mono">{d.event}</td>
                  <td className={`py-1 pr-3 font-mono ${statusClass(d.statusCode)}`}>
                    {d.statusCode ?? 'No response'}
                  </td>
                  <td className="py-1 pr-3 whitespace-nowrap">
                    {d.responseTimeMs === null ? '—' : `${d.responseTimeMs} ms`}
                  </td>
                  <td className="py-1 font-mono break-all text-gray-600">
                    {previewBody(d.responseBody)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav
        aria-label="Delivery history pagination"
        className="flex items-center justify-between pt-2"
      >
        <button
          type="button"
          className="btn-secondary disabled:opacity-50"
          onClick={() => setPage((p) => p - 1)}
          disabled={loading || page <= 1}
        >
          Newer
        </button>
        <span className="text-xs text-gray-500">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || page >= totalPages}
        >
          Older
        </button>
      </nav>
    </div>
  );
}

function WebhookSecretRow({
  webhook,
  onRotated,
}: {
  webhook: Webhook;
  onRotated: (secret: string) => void;
}) {
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
            aria-label={
              revealed ? 'Hide signing secret' : 'Show signing secret'
            }
          >
            {revealed ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            data-testid={`copy-secret-${webhook.id}`}
            onClick={copySecret}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Copy signing secret"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            data-testid={`rotate-secret-${webhook.id}`}
            onClick={rotate}
            disabled={rotating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Rotate signing secret"
          >
            <RefreshCw
              className={`w-4 h-4 ${rotating ? 'animate-spin' : ''}`}
            />
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
  onViewDeliveries: (webhook: Webhook) => void;
}

const MAX_URL_LENGTH = 50;

const WebhookRow = memo(function WebhookRow({
  webhook: w,
  onDelete,
  onSecretRotated,
  onViewDeliveries,
}: WebhookRowProps) {
  const [urlCopied, setUrlCopied] = useState(false);
  const displayUrl =
    w.url.length > MAX_URL_LENGTH
      ? `${w.url.slice(0, MAX_URL_LENGTH)}…`
      : w.url;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(w.url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      toast.error('Failed to copy webhook URL');
    }
  };

  return (
    <div
      data-testid={`webhook-row-${w.id}`}
      className="card p-5 flex items-start justify-between"
    >
      <div className="flex-1 min-w-0">
        <button
          type="button"
          data-testid={`copy-url-${w.id}`}
          onClick={copyUrl}
          title={w.url}
          aria-label={`Copy webhook URL: ${w.url}`}
          className="flex max-w-full items-center gap-2 text-left text-blue-600 hover:underline"
        >
          <span className="truncate font-mono text-sm font-medium">
            {displayUrl}
          </span>
          {urlCopied ? (
            <Check className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
        </button>
        <div className="flex flex-wrap gap-1 mt-2">
          {w.events.map((e: string) => (
            <span
              key={e}
              className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded"
            >
              {e}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Created {formatDate(w.createdAt)}
        </p>
        <button
          type="button"
          data-testid={`view-deliveries-${w.id}`}
          onClick={() => onViewDeliveries(w)}
          className="mt-2 text-xs text-brand-600 hover:underline"
        >
          View deliveries
        </button>
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
  const [form, setForm] = useState({
    url: '',
    events: [] as string[],
    secret: '',
  });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [deliveriesFor, setDeliveriesFor] = useState<Webhook | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

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
        setWebhooks((current) => [
          data,
          ...current.filter((item) => item.id !== data.id),
        ]);
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
      const nextEvents = f.events.includes(e)
        ? f.events.filter((x) => x !== e)
        : [...f.events, e];
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
    setExpandedEvents([]);
  };

  const updateWebhookSecret = useCallback((id: string, secret: string) => {
    setWebhooks((current) =>
      current.map((webhook) =>
        webhook.id === id ? { ...webhook, secret } : webhook
      )
    );
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Webhooks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Get notified when payment events occur
          </p>
        </div>
        <button
          data-testid="new-webhook-button"
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {loading ? (
        <div
          data-testid="webhooks-loading"
          className="card divide-y divide-gray-50"
        >
          <SkeletonList rows={4} />
        </div>
      ) : loadError ? (
        <div data-testid="webhooks-error" className="card p-8 text-center">
          <p className="text-sm text-red-600 mb-3">{loadError}</p>
          <button onClick={load} className="btn-secondary">
            Retry
          </button>
        </div>
      ) : webhooks.length === 0 ? (
        <div
          data-testid="webhooks-empty"
          className="card p-8 text-center text-sm text-gray-500"
        >
          No webhooks configured. Add one to start receiving event
          notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <WebhookRow
              key={w.id}
              webhook={w}
              onDelete={setDeletingId}
              onSecretRotated={updateWebhookSecret}
              onViewDeliveries={setDeliveriesFor}
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
          {/* Disabling the whole fieldset prevents submits while a creation call is in flight. */}
          <fieldset disabled={creating} className="space-y-4">
            <div>
              <label htmlFor="webhook-url" className="label">
                Endpoint URL
              </label>
              <input
                id="webhook-url"
                type="url"
                required
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="https://example.com/webhooks"
                className="input font-mono"
              />
            </div>

            <fieldset
              data-testid="webhook-events-fieldset"
              aria-labelledby="webhook-events-legend"
              className="mt-0"
            >
              <legend id="webhook-events-legend" className="label">
                Events
              </legend>
              <a
                href="https://docs.dupdub.io/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-brand-600 hover:underline mb-2"
              >
                Webhook docs
              </a>
              <p className="text-xs text-gray-500 mb-2">
                Select events to subscribe to. Expand an event for details and a
                sample payload.
              </p>
              <div className="space-y-2">
                {WEBHOOK_EVENTS.map((event) => {
                  const details = WEBHOOK_EVENT_DETAILS[event];
                  const expanded = expandedEvents.includes(event);
                  return (
                    <div
                      key={event}
                      className="rounded-lg border border-gray-100 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                          <input
                            type="checkbox"
                            checked={form.events.includes(event)}
                            onChange={() => toggleEvent(event)}
                          />
                          <span className="font-mono text-xs">{event}</span>
                        </label>
                        <button
                          type="button"
                          data-testid={`webhook-event-details-${event}`}
                          onClick={() =>
                            setExpandedEvents((current) =>
                              current.includes(event)
                                ? current.filter((e) => e !== event)
                                : [...current, event]
                            )
                          }
                          aria-expanded={expanded}
                          aria-controls={`webhook-event-panel-${event}`}
                          className="text-xs text-brand-600 hover:underline shrink-0"
                        >
                          {expanded ? 'Hide details' : 'Details'}
                        </button>
                      </div>
                      {details ? (
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {details.description}
                        </p>
                      ) : null}
                      {expanded && details ? (
                        <div
                          id={`webhook-event-panel-${event}`}
                          className="mt-2 ml-6"
                        >
                          <p className="text-[11px] font-medium text-gray-500 mb-1">
                            Sample payload
                          </p>
                          <pre className="text-[11px] bg-gray-50 border border-gray-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(details.samplePayload, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {formError && (
                <p
                  data-testid="webhook-events-error"
                  className="text-xs text-red-600 mt-1"
                >
                  {formError}
                </p>
              )}
            </fieldset>

            <div>
              <label htmlFor="webhook-secret" className="label">
                Signing secret (optional)
              </label>
              <div className="relative">
                <input
                  id="webhook-secret"
                  type={secretRevealed ? 'text' : 'password'}
                  value={form.secret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, secret: e.target.value }))
                  }
                  placeholder="Leave blank to auto-generate"
                  className="input font-mono pr-10"
                  data-testid="webhook-secret-input"
                />
                <button
                  type="button"
                  data-testid="toggle-webhook-secret"
                  onClick={() => setSecretRevealed((v) => !v)}
                  aria-pressed={secretRevealed}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={
                    secretRevealed
                      ? 'Hide signing secret'
                      : 'Show signing secret'
                  }
                >
                  {secretRevealed ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="webhook-submit-button"
                disabled={creating}
                className="btn-primary disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Webhook'}
              </button>
            </div>
          </fieldset>
        </form>
      </Modal>

      <Modal
        open={deliveriesFor !== null}
        onClose={() => setDeliveriesFor(null)}
        title="Delivery history"
        testId="webhook-deliveries-modal"
        contentClassName="max-w-3xl"
      >
        {deliveriesFor ? (
          <WebhookDeliveriesPanel
            key={deliveriesFor.id}
            webhook={deliveriesFor}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete webhook?"
        message="This webhook will stop receiving event notifications."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => deletingId && remove(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
