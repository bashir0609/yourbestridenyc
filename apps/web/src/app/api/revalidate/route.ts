import { revalidateTag } from 'next/cache';
import { authorized, validateRevalidation } from '@/lib/revalidation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const reply = (body: object, status: number) => Response.json(body, { status, headers });

export async function POST(request: Request) {
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret || secret.length < 32) return reply({ error: 'Not found' }, 404);
  if (!authorized(request.headers.get('authorization'), secret))
    return reply({ error: 'Unauthorized' }, 401);
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  )
    return reply({ error: 'Expected application/json' }, 415);
  if (!request.body) return reply({ error: 'Invalid request' }, 400);
  if (Number(request.headers.get('content-length')) > 2048)
    return reply({ error: 'Request too large' }, 413);

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('Read timeout'));
        void reader.cancel().catch(() => undefined);
      }, 3000);
    });
    while (true) {
      const part = await Promise.race([reader.read(), timeout]);
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 2048) return reply({ error: 'Request too large' }, 413);
      body += decoder.decode(part.value, { stream: true });
    }
    const tags = validateRevalidation(JSON.parse(body + decoder.decode()) as unknown);
    if (!tags) return reply({ error: 'Expected a nonempty allowlisted tags array' }, 400);
    // Publishing webhooks must expire content immediately, including unpublished records.
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
    return reply({ revalidated: true, tags }, 200);
  } catch {
    return reply({ error: 'Invalid request' }, 400);
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
