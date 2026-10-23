'use client';

import { useEffect, useRef, useState } from 'react';

type Step = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    id: 'merchant',
    label: 'Merchant QR',
    icon: (
      <g>
        <rect
          x="-18"
          y="-18"
          width="36"
          height="36"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect x="-12" y="-12" width="8" height="8" fill="currentColor" />
        <rect x="4" y="-12" width="8" height="8" fill="currentColor" />
        <rect x="-12" y="4" width="8" height="8" fill="currentColor" />
        <rect x="4" y="4" width="4" height="4" fill="currentColor" />
      </g>
    ),
  },
  {
    id: 'wallet',
    label: 'Customer Wallet',
    icon: (
      <g>
        <rect
          x="-18"
          y="-12"
          width="36"
          height="24"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect x="6" y="-4" width="10" height="8" rx="2" fill="currentColor" />
      </g>
    ),
  },
  {
    id: 'bank',
    label: 'Bank Account',
    icon: (
      <g>
        <path
          d="M-18 6 L0 -14 L18 6 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect
          x="-14"
          y="6"
          width="28"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="-6"
          y1="6"
          x2="-6"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="6"
          y1="6"
          x2="6"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
        />
      </g>
    ),
  },
];

const NODE_X = [60, 200, 340];
const NODE_Y = 60;

function PaymentFlowIllustration() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const animate = inView && !reducedMotion;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-md mx-auto text-slate-700 dark:text-slate-200"
    >
      <svg
        viewBox="0 0 400 140"
        role="img"
        aria-label="Payment flow: merchant QR code to customer wallet to bank account"
        className="w-full h-auto"
      >
        <defs>
          <marker
            id="pf-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="currentColor" />
          </marker>
        </defs>

        {STEPS.map((step, i) => (
          <g key={step.id} transform={`translate(${NODE_X[i]}, ${NODE_Y})`}>
            <circle
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity={animate ? 1 : 0.6}
              style={
                animate
                  ? {
                      animation: `pf-pulse 2s ease-in-out ${i * 0.4}s infinite`,
                    }
                  : undefined
              }
            />
            <g transform="translate(0, 0)">{step.icon}</g>
            <text
              y="52"
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
              className="select-none"
            >
              {step.label}
            </text>
          </g>
        ))}

        {[0, 1].map((i) => (
          <line
            key={i}
            x1={NODE_X[i] + 32}
            y1={NODE_Y}
            x2={NODE_X[i + 1] - 32}
            y2={NODE_Y}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#pf-arrow)"
            opacity={animate ? 1 : 0.5}
          />
        ))}

        {animate &&
          [0, 1].map((i) => (
            <circle key={`dot-${i}`} r="4" fill="currentColor">
              <animateMotion
                dur="1.6s"
                begin={`${i * 0.8}s`}
                repeatCount="indefinite"
                path={`M${NODE_X[i] + 32},${NODE_Y} L${NODE_X[i + 1] - 32},${NODE_Y}`}
              />
            </circle>
          ))}
      </svg>

      <style jsx>{`
        @keyframes pf-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(svg) * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export { PaymentFlowIllustration };
export default PaymentFlowIllustration;
