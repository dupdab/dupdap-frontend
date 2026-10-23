'use client';

import { useEffect, useState } from 'react';

import { merchantApi } from '@/lib/api';
import {
  isNearRateLimit,
  parseRateLimit,
  rateLimitPercent,
  type RateLimitUsage,
} from '@/lib/rate-limit';

const DOCS_URL = 'https://docs.dupdub.com/api/rate-limiting';

export function ApiRateLimitIndicator() {
  const [usage, setUsage] = useState<RateLimitUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    merchantApi
      .rateLimit()
      .then(({ data }) => {
        if (!cancelled) setUsage(parseRateLimit(data));
      })
      .catch(() => {
        if (!cancelled) setUsage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const percent = usage ? rateLimitPercent(usage) : 0;
  const near = usage ? isNearRateLimit(usage) : false;

  return (
    <div
      className="mb-4 rounded-lg border border-gray-200 p-4"
      data-testid="api-rate-limit"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">API rate limit</p>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline"
        >
          Rate limiting docs
        </a>
      </div>
      {loading ? (
        <p className="text-xs text-gray-500">Loading rate limit…</p>
      ) : usage ? (
        <>
          <p className="text-sm text-gray-700 mb-2">
            {usage.used} / {usage.limit} requests/min
          </p>
          <div
            role="progressbar"
            aria-label="API rate limit usage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 w-full rounded-full bg-gray-100 overflow-hidden"
          >
            <div
              className={`h-full rounded-full ${near ? 'bg-red-500' : 'bg-brand-500'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          {near && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              You have used {percent}% of your rate limit.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            We email you when usage reaches 80% of your limit.
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-500">
          Rate limit information is unavailable right now.
        </p>
      )}
    </div>
  );
}
