import 'server-only';

import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { sendIntakeNotification, type IntakeData, type IntakeKind } from '@/lib/email';

const MAX_BODY_BYTES = 32 * 1024;
const CMS_TIMEOUT_MS = 5_000;

export type IntakeHandlerOptions<T extends IntakeData> = {
  kind: IntakeKind;
  source: string;
  schema: {
    safeParse(input: unknown): { success: true; data: T } | { success: false };
  };
};

type IntakeDependencies = {
  fetch: typeof fetch;
  notify: typeof sendIntakeNotification;
  env: Record<string, string | undefined>;
};

const defaultDependencies: IntakeDependencies = {
  fetch,
  notify: sendIntakeNotification,
  env: process.env,
};

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getTrustedRequestIp(headers: Headers): string | undefined {
  const validIp = (value: string | null | undefined) => {
    const candidate = value?.trim();
    return candidate && isIP(candidate) ? candidate : undefined;
  };
  const directHeaders = ['cf-connecting-ip', 'fly-client-ip', 'x-real-ip'];
  for (const name of directHeaders) {
    const value = validIp(headers.get(name));
    if (value) return value;
  }

  const forwarded = headers.get('x-vercel-forwarded-for') ?? headers.get('x-forwarded-for');
  return validIp(forwarded?.split(',')[0]);
}

export function createFingerprint(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}

export function createIntakeHandler<T extends IntakeData>(
  options: IntakeHandlerOptions<T>,
  dependencies: IntakeDependencies = defaultDependencies,
) {
  return async function POST(request: Request): Promise<Response> {
    const { SITE_URL, INTAKE_API_SECRET, INTAKE_HASH_SECRET } = dependencies.env;
    if (!SITE_URL || !INTAKE_API_SECRET || !INTAKE_HASH_SECRET) {
      console.error('Public intake is not configured');
      return json(503, { error: 'Submission service unavailable' });
    }

    const ip = getTrustedRequestIp(request.headers);
    if (!ip) {
      console.error('Public intake request has no trusted client IP');
      return json(400, { error: 'Unable to process submission' });
    }

    const contentType = request.headers.get('content-type')?.toLowerCase();
    if (!contentType || !/^application\/json(?:\s*;|$)/.test(contentType)) {
      return json(415, { error: 'Content-Type must be application/json' });
    }

    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return json(413, { error: 'Request body is too large' });
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return json(400, { error: 'Invalid request body' });
    }

    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: 'Request body is too large' });
    }

    let input: unknown;
    try {
      input = JSON.parse(rawBody);
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }

    if (!isPlainObject(input)) return json(400, { error: 'Invalid submission' });
    const keys = Object.keys(input);
    if (keys.some((key) => !['data', 'sourcePage', 'website'].includes(key))) {
      return json(400, { error: 'Invalid submission' });
    }
    const sourcePage = typeof input.sourcePage === 'string' ? input.sourcePage.trim() : '';
    const website = input.website === undefined ? '' : input.website;
    const parsedData = options.schema.safeParse(input.data);
    if (
      !sourcePage ||
      sourcePage.length > 200 ||
      typeof website !== 'string' ||
      website.length > 200 ||
      !parsedData.success
    ) {
      return json(400, { error: 'Invalid submission' });
    }

    // Quietly accept bot-filled honeypots without persisting or notifying.
    if (website.trim()) {
      return json(201, { success: true });
    }

    let cmsUrl: URL;
    try {
      cmsUrl = new URL('/api/public-intake', SITE_URL);
      if (!['http:', 'https:'].includes(cmsUrl.protocol)) throw new Error('Unsupported protocol');
    } catch {
      console.error('Public intake site URL is invalid');
      return json(503, { error: 'Submission service unavailable' });
    }

    let upstream: Response;
    try {
      upstream = await dependencies.fetch(cmsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${INTAKE_API_SECRET}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Intake-Fingerprint': createFingerprint(ip, INTAKE_HASH_SECRET),
        },
        body: JSON.stringify({
          type:
            options.kind === 'driver'
              ? 'driver-application'
              : options.kind === 'contact'
                ? 'contact-lead'
                : 'transportation-lead',
          sourcePage,
          sourceCampaign: options.source,
          data: parsedData.data,
        }),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(CMS_TIMEOUT_MS),
      });
    } catch {
      console.error('Public intake storage request failed');
      return json(502, { error: 'Unable to submit right now' });
    }

    if (upstream.status === 429) {
      return json(429, { error: 'Too many submissions. Please try again later.' });
    }
    if (upstream.status !== 202) {
      console.error('Public intake storage rejected submission', { status: upstream.status });
      return json(502, { error: 'Unable to submit right now' });
    }

    try {
      await dependencies.notify({
        kind: options.kind,
        sourcePage,
        data: parsedData.data,
      });
    } catch {
      // Storage is authoritative; notification failure must not change the result.
      console.error('Public intake notification failed', { kind: options.kind });
    }

    return json(201, { success: true });
  };
}
