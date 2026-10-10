import { driverApplicationSchema } from '@yourbestride/types';
import { createIntakeHandler } from '@/lib/intake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createIntakeHandler({
  kind: 'driver',
  source: 'web',
  schema: driverApplicationSchema,
});
