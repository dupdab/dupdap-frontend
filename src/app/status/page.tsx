'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const STATUSPAGE_URL = 'https://dupdub.betteruptime.com';

interface HealthResponse {
  status?: string;
  stellar?: { status?: string } | string;
  settlementQueue?: { status?: string; pending?: number } | string;
  [key: string]: unknown;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  startedAt: string;
  resolvedAt?: string | null;
  description?: string;
}

type ServiceState = 'operational' | 'degraded' | 'down' | 'unknown';

function normalize(value: unknown): ServiceState {
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    if (v === 'ok' || v === 'up' || v === 'operational' || v === 'healthy') return 'operational';
    if (v === 'degraded' || v === 'partial') return 'degraded';
    if (v === 'down' || v === 'error' || v === 'outage') return 'down';
  }
  return 'unknown';
}

const STATE_STYLES: Record<ServiceState, { label: string; dot: string; text: string }> = {
  operational: { label: 'Operational', dot: 'bg-green-500', text: 'text-green-700' },
  degraded: { label: 'Degraded', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  down: { label: 'Down', dot: 'bg-red-500', text: 'text-red-700' },
  unknown: { label: 'Unknown', dot: 'bg-gray-400', text: 'text-gray-600' },
};

function StatusRow({ name, state }: { name: string; state: ServiceState }) {
  const style = STATE_STYLES[state];
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
      <span className="font-medium text-gray-800">{name}</span>
      <span className={`flex items-center gap-2 text-sm ${style.text}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden="true" />
        {style.label}
      </span>
    </div>
  );
}

export default function StatusPage() {
  const [loading, setLoading] = useState(true);
  const [apiState, setApiState] = useState<ServiceState>('unknown');
  const [stellarState, setStellarState] = useState<ServiceState>('unknown');
  const [queueState, setQueueState] = useState<ServiceState>('unknown');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      const data: HealthResponse = await res.json();
      setApiState(normalize(data.status ?? 'ok'));
      setStellarState(normalize(data.stellar));
      setQueueState(normalize(data.settlementQueue));
    } catch {
      setApiState('down');
      setStellarState('unknown');
      setQueueState('unknown');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health/incidents?days=7`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list: Incident[] = Array.isArray(data) ? data : data.incidents ?? [];
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setIncidents(list.filter((i) => new Date(i.startedAt).getTime() >= cutoff));
    } catch {
      // Incident history is best-effort; leave empty on failure.
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadIncidents();
    const interval = setInterval(loadHealth, 60_000);
    return () => clearInterval(interval);
  }, [loadHealth, loadIncidents]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribing(true);
    try {
      const res = await fetch(`${API_BASE}/health/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Subscribe failed');
      toast.success('Subscribed to status updates');
      setEmail('');
    } catch {
      toast.error('Could not subscribe. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">DupDub Status</h1>
      <p className="mt-2 text-gray-600">Current service status and recent incidents.</p>

      <section className="mt-8 rounded-lg border border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Services</h2>
          <button
            type="button"
            onClick={loadHealth}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <StatusRow name="API" state={apiState} />
        <StatusRow name="Stellar Network" state={stellarState} />
        <StatusRow name="Settlement Queue" state={queueState} />
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Incident History (last 7 days)</h2>
        {incidents.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No incidents reported in the last 7 days.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {incidents.map((incident) => (
              <li key={incident.id} className="border-l-2 border-gray-300 pl-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{incident.title}</span>
                  <span className="text-xs uppercase text-gray-500">{incident.status}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(incident.startedAt).toLocaleString()}
                  {incident.resolvedAt ? ` — resolved ${new Date(incident.resolvedAt).toLocaleString()}` : ''}
                </p>
                {incident.description && <p className="mt-1 text-sm text-gray-700">{incident.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Subscribe to status updates</h2>
        <p className="mt-1 text-sm text-gray-600">Get an email when incidents are opened or resolved.</p>
        <form onSubmit={handleSubscribe} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={subscribing}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {subscribing ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
      </section>

      <p className="mt-8 text-sm text-gray-600">
        For detailed uptime monitoring, see our{' '}
        <a href={STATUSPAGE_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Better Uptime status page
        </a>
        .
      </p>
    </main>
  );
}
