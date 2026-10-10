import { createHash, timingSafeEqual } from 'node:crypto';
import {
  contactFormSchema,
  driverApplicationSchema,
  transportationInquirySchema,
} from '../../../packages/types/src/forms';
import type { Endpoint, PayloadRequest } from 'payload';

export const INTAKE_BODY_LIMIT = 16 * 1024;
export const INTAKE_RATE_LIMIT = 5;
export const INTAKE_RATE_WINDOW_MS = 60_000;

const fingerprintPattern = /^[a-f0-9]{64}$/;
const allowedEnvelopeKeys = new Set(['type', 'sourcePage', 'sourceCampaign', 'data']);

type IntakeType = 'transportation-lead' | 'contact-lead' | 'driver-application';

type IntakeEnvelope = {
  type: IntakeType;
  sourcePage: string;
  sourceCampaign?: string;
  data: Record<string, unknown>;
};

type RateLimitPayload = Pick<PayloadRequest['payload'], 'create' | 'delete' | 'find'>;

export function validFingerprint(value: string | null): value is string {
  return value !== null && fingerprintPattern.test(value);
}

export function validBearer(value: string | null, secret: string): boolean {
  if (!value?.startsWith('Bearer ')) return false;
  const supplied = value.slice(7);
  const suppliedDigest = createHash('sha256').update(supplied).digest();
  const expectedDigest = createHash('sha256').update(secret).digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

function validSourcePage(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048) return false;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateEnvelope(value: unknown): IntakeEnvelope | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowedEnvelopeKeys.has(key))) return null;
  if (
    input.type !== 'transportation-lead' &&
    input.type !== 'contact-lead' &&
    input.type !== 'driver-application'
  )
    return null;
  if (!validSourcePage(input.sourcePage)) return null;
  if (
    input.sourceCampaign !== undefined &&
    (typeof input.sourceCampaign !== 'string' || input.sourceCampaign.length > 200)
  )
    return null;

  const schema =
    input.type === 'transportation-lead'
      ? transportationInquirySchema
      : input.type === 'contact-lead'
        ? contactFormSchema
        : driverApplicationSchema;
  const parsed = schema.safeParse(input.data);
  if (!parsed.success) return null;

  return {
    type: input.type,
    sourcePage: input.sourcePage,
    ...(input.sourceCampaign ? { sourceCampaign: input.sourceCampaign } : {}),
    data: parsed.data,
  };
}

export async function readStrictJSON(
  request: Pick<Request, 'headers' | 'arrayBuffer'>,
): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.toLowerCase();
  if (contentType !== 'application/json' && contentType !== 'application/json; charset=utf-8') {
    throw new IntakeRequestError(415);
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > INTAKE_BODY_LIMIT)
      throw new IntakeRequestError(413);
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) throw new IntakeRequestError(400);
  if (bytes.byteLength > INTAKE_BODY_LIMIT) throw new IntakeRequestError(413);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new IntakeRequestError(400);
  }
}

export function mapSubmission(envelope: IntakeEnvelope, now = new Date()) {
  const common = {
    source: 'public-intake' as const,
    sourcePage: envelope.sourcePage,
    sourceCampaign: envelope.sourceCampaign,
    consentToContact: true,
    consentRecordedAt: now.toISOString(),
  };
  if (envelope.type === 'contact-lead') {
    const data = envelope.data as {
      name: string;
      email: string;
      phone: string;
      message: string;
    };
    return {
      collection: 'transportation-leads' as const,
      data: {
        ...common,
        name: data.name,
        email: data.email,
        phone: data.phone,
        serviceType: 'Contact',
        message: data.message,
        crmStatus: 'new' as const,
      },
    };
  }
  if (envelope.type === 'transportation-lead') {
    const data = envelope.data as {
      fullName: string;
      email: string;
      phone: string;
      serviceType: string;
      pickupArea: string;
      dropoffArea: string;
      message: string;
      preferredDate?: string;
      preferredTime?: string;
    };
    return {
      collection: 'transportation-leads' as const,
      data: {
        ...common,
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        serviceType: data.serviceType,
        pickupLocation: data.pickupArea,
        dropoffLocation: data.dropoffArea,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        message: data.message,
        crmStatus: 'new' as const,
      },
    };
  }
  const data = envelope.data as {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    drivingExperience: string;
    licenseClass: string;
    availability: string;
    message: string;
  };
  return {
    collection: 'driver-applications' as const,
    data: {
      ...common,
      name: data.fullName,
      email: data.email,
      phone: data.phone,
      city: data.location,
      drivingExperience: data.drivingExperience,
      licenseClass: data.licenseClass,
      availability: data.availability,
      message: data.message,
      status: 'new' as const,
    },
  };
}

export async function consumeRateLimit(
  payload: RateLimitPayload,
  fingerprint: string,
  now = new Date(),
): Promise<boolean> {
  const windowStart = Math.floor(now.getTime() / INTAKE_RATE_WINDOW_MS) * INTAKE_RATE_WINDOW_MS;
  const expiresAt = new Date(windowStart + INTAKE_RATE_WINDOW_MS);

  // Opportunistic cleanup prevents unbounded retention; correctness does not depend on cleanup.
  await payload.delete({
    collection: 'public-intake-rate-limits',
    where: { expiresAt: { less_than_equal: now.toISOString() } },
    overrideAccess: true,
  });

  for (let slot = 1; slot <= INTAKE_RATE_LIMIT; slot += 1) {
    const claimKey = `${fingerprint}:${windowStart}:${slot}`;
    try {
      await payload.create({
        collection: 'public-intake-rate-limits',
        data: {
          claimKey,
          fingerprint,
          windowStartedAt: new Date(windowStart).toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
        overrideAccess: true,
      });
      return true;
    } catch {
      const existing = await payload.find({
        collection: 'public-intake-rate-limits',
        where: { claimKey: { equals: claimKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (existing.totalDocs === 0) throw new Error('Unable to record intake rate limit');
    }
  }
  return false;
}

class IntakeRequestError extends Error {
  constructor(readonly status: number) {
    super('Invalid public intake request');
  }
}

const response = (status: number) =>
  Response.json(status === 202 ? { ok: true } : { ok: false }, { status });

export function createPublicIntakeEndpoint(secret: string): Endpoint {
  return {
    path: '/public-intake',
    method: 'post',
    handler: async (req) => {
      if (!validBearer(req.headers.get('authorization'), secret)) return response(401);
      const fingerprint = req.headers.get('x-intake-fingerprint');
      if (!validFingerprint(fingerprint)) return response(400);

      try {
        const envelope = validateEnvelope(
          await readStrictJSON(req as PayloadRequest & Pick<Request, 'headers' | 'arrayBuffer'>),
        );
        if (!envelope) return response(400);
        if (!(await consumeRateLimit(req.payload, fingerprint))) return response(429);
        const submission = mapSubmission(envelope);
        await req.payload.create({
          ...submission,
          overrideAccess: true,
          req,
        });
        return response(202);
      } catch (error) {
        if (error instanceof IntakeRequestError) return response(error.status);
        req.payload.logger.error({ err: error }, 'Public intake ingestion failed');
        return response(500);
      }
    },
  };
}
