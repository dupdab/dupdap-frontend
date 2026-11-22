import { http, HttpResponse } from 'msw';

import type {
  AuthResponse,
  Merchant,
  Payment,
  PaymentListResponse,
  PaymentStats,
  Settlement,
  SettlementListResponse,
  TopMerchant,
  Webhook,
} from '@/lib/types';

const merchant: Merchant = {
  id: 'merch_001',
  email: 'merchant@example.com',
  businessName: 'Acme Stores',
  status: 'active',
  role: 'merchant',
  country: 'NG',
  bankAccountNumber: '0123456789',
  bankCode: '058',
  bankName: 'GTBank',
};

const payments: Payment[] = [
  {
    id: 'pay_001',
    reference: 'PAY-1001',
    amountUsd: 25,
    amountXlm: 100,
    status: 'pending',
    description: 'Order #1001',
    customerEmail: 'customer@example.com',
    stellarMemo: 'memo-1001',
    stellarDepositAddress: 'GDESTINATIONADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiryMinutes: 30,
  },
  {
    id: 'pay_002',
    reference: 'PAY-1002',
    amountUsd: 120.5,
    amountXlm: 482,
    status: 'settled',
    description: 'Subscription renewal',
    customerEmail: 'jane@example.com',
    stellarMemo: 'memo-1002',
    stellarDepositAddress: 'GDESTINATIONADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
  },
  {
    id: 'pay_003',
    reference: 'PAY-1003',
    amountUsd: 75,
    amountXlm: 300,
    status: 'failed',
    description: 'Failed checkout',
    stellarMemo: 'memo-1003',
    stellarDepositAddress: 'GDESTINATIONADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

const settlements: Settlement[] = [
  {
    id: 'set_001',
    merchantId: merchant.id,
    merchant: { businessName: merchant.businessName },
    totalAmountUsd: 500,
    feeAmountUsd: 5,
    netAmountUsd: 495,
    status: 'completed',
    partnerReference: 'BANK-REF-001',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    fiatCurrency: 'NGN',
    fiatAmount: 742500,
  },
  {
    id: 'set_002',
    merchantId: merchant.id,
    merchant: { businessName: merchant.businessName },
    totalAmountUsd: 200,
    feeAmountUsd: 2,
    netAmountUsd: 198,
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    fiatCurrency: 'NGN',
    fiatAmount: 297000,
  },
];

const webhooks: Webhook[] = [
  {
    id: 'wh_001',
    url: 'https://example.com/webhooks/dupdap',
    events: ['payment.confirmed', 'settlement.completed'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

const stats: PaymentStats[] = [
  { status: 'pending', count: '1', totalUsd: '25.00' },
  { status: 'settled', count: '1', totalUsd: '120.50' },
  { status: 'failed', count: '1', totalUsd: '75.00' },
];

const topMerchants: TopMerchant[] = [
  {
    merchantId: merchant.id,
    merchantName: merchant.businessName,
    totalVolume: 145.5,
    paymentCount: 3,
    avgOrderValue: 48.5,
  },
];

function ok<T>(data: T, init?: number | ResponseInit) {
  return HttpResponse.json(data, typeof init === 'number' ? { status: init } : init);
}

function notFound(message = 'Not found') {
  return HttpResponse.json({ message }, { status: 404 });
}

function paged<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export const handlers = [
  // Auth
  http.post('*/auth/register', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const response: AuthResponse = {
      merchant: {
        ...merchant,
        email: String(body.email ?? merchant.email),
        businessName: String(body.businessName ?? merchant.businessName),
        country: String(body.country ?? merchant.country ?? 'NG'),
      },
    };
    return ok(response, 201);
  }),
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const response: AuthResponse = {
      merchant: {
        ...merchant,
        email: String(body.email ?? merchant.email),
      },
    };
    return ok(response);
  }),
  http.post('*/auth/logout', () => ok({ success: true })),
  http.post('*/auth/forgot-password', () => ok({ success: true })),
  http.post('*/auth/reset-password', () => ok({ success: true })),

  // Payments
  http.get('*/payments/stats', () => ok(stats)),
  http.get('*/payments/top-merchants', () => ok(topMerchants)),
  http.get('*/payments', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const response: PaymentListResponse = {
      payments: paged(payments, page, limit),
      total: payments.length,
    };
    return ok(response);
  }),
  http.post('*/payments', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const amountUsd = Number(body.amountUsd ?? 10);
    const id = `pay_${Date.now()}`;
    const reference = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const payment: Payment = {
      id,
      reference,
      amountUsd,
      amountXlm: Math.round(amountUsd * 4),
      status: 'pending',
      description: typeof body.description === 'string' ? body.description : undefined,
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail : undefined,
      stellarMemo: `memo-${reference}`,
      stellarDepositAddress: 'GDESTINATIONADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
      createdAt: new Date().toISOString(),
      expiryMinutes: Number(body.expiryMinutes ?? 30),
    };
    payments.unshift(payment);
    return ok(payment, 201);
  }),
  http.get('*/payments/:id', ({ params }) => {
    const payment = payments.find((p) => p.id === params.id || p.reference === params.id);
    return payment ? ok(payment) : notFound('Payment not found');
  }),
  http.get('*/pay/:ref', ({ params }) => {
    const payment = payments.find((p) => p.reference === params.ref || p.id === params.ref);
    return payment ? ok(payment) : notFound('Payment not found');
  }),

  // Settlements
  http.get('*/settlements', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const response: SettlementListResponse = {
      settlements: paged(settlements, page, limit),
      total: settlements.length,
    };
    return ok(response);
  }),
  http.get('*/settlements/:id', ({ params }) => {
    const settlement = settlements.find((s) => s.id === params.id);
    return settlement ? ok(settlement) : notFound('Settlement not found');
  }),

  // Merchant
  http.get('*/merchants/me', () => ok(merchant)),
  http.patch('*/merchants/me', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    Object.assign(merchant, body);
    return ok(merchant);
  }),
  http.post('*/merchants/api-keys', () => ok({ apiKey: 'dd_test_mock_api_key_1234567890' })),
  http.get('*/merchants/api-keys/rate-limit', () =>
    ok({ limit: 1000, remaining: 987, resetAt: new Date(Date.now() + 3600000).toISOString() })
  ),
  http.get('*/merchants/me/bank-accounts', () =>
    ok([
      {
        id: 'ba_001',
        bankName: 'GTBank',
        accountNumber: '0123456789',
        routingNumber: '058',
        currency: 'NGN',
        isDefault: true,
      },
    ])
  ),
  http.post('*/merchants/me/bank-accounts', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return ok(
      {
        id: `ba_${Date.now()}`,
        bankName: String(body.bankName ?? 'Mock Bank'),
        accountNumber: String(body.accountNumber ?? '0000000000'),
        routingNumber: String(body.routingNumber ?? '000'),
        currency: String(body.currency ?? 'NGN'),
        isDefault: false,
      },
      201
    );
  }),
  http.patch('*/merchants/me/bank-accounts/:id/default', ({ params }) =>
    ok({
      id: String(params.id),
      bankName: 'GTBank',
      accountNumber: '0123456789',
      routingNumber: '058',
      currency: 'NGN',
      isDefault: true,
    })
  ),
  http.delete('*/merchants/me/bank-accounts/:id', () => new HttpResponse(null, { status: 204 })),

  // Webhooks
  http.get('*/webhooks', () => ok(webhooks)),
  http.post('*/webhooks', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const webhook: Webhook = {
      id: `wh_${Date.now()}`,
      url: String(body.url ?? 'https://example.com/webhook'),
      events: Array.isArray(body.events) ? (body.events as string[]) : ['payment.confirmed'],
      secret: 'whsec_mock_secret',
      createdAt: new Date().toISOString(),
    };
    webhooks.push(webhook);
    return ok(webhook, 201);
  }),
  http.post('*/webhooks/:id/rotate-secret', ({ params }) => {
    const webhook = webhooks.find((w) => w.id === params.id);
    if (!webhook) return notFound('Webhook not found');
    return ok({ ...webhook, secret: `whsec_rotated_${Date.now()}` });
  }),
  http.delete('*/webhooks/:id', ({ params }) => {
    const idx = webhooks.findIndex((w) => w.id === params.id);
    if (idx >= 0) webhooks.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Admin
  http.get('*/admin/settlements', () => ok({ settlements, total: settlements.length })),
  http.post('*/admin/settlements/:id/retry', ({ params }) => {
    const settlement = settlements.find((s) => s.id === params.id);
    return settlement ? ok({ ...settlement, status: 'processing' }) : notFound('Settlement not found');
  }),
  http.post('*/admin/settlements/:id/approve', ({ params }) => {
    const settlement = settlements.find((s) => s.id === params.id);
    return settlement ? ok({ ...settlement, status: 'approved' }) : notFound('Settlement not found');
  }),

  // Waitlist
  http.post('*/waitlist/join', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return ok({ success: true, email: body.email ?? 'user@example.com' }, 201);
  }),
  http.get('*/waitlist/check/:username', ({ params }) => ok({ username: params.username, available: true })),
  http.get('*/waitlist/stats', () => ok({ count: 1284, countries: 12 })),
];
