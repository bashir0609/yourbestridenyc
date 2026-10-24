import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORES_ALIAS,
  ORES_HOSTED_URL,
  ORES_WIDGET_LOADER_URL,
  resolveOresBookingUrl,
} from '../src/lib/booking';

test('ORES configuration uses the approved company alias and vendor URLs', () => {
  assert.equal(ORES_ALIAS, 'yourbestride');
  assert.equal(ORES_HOSTED_URL, 'https://book.mylimobiz.com/v4/yourbestride');
  assert.equal(ORES_WIDGET_LOADER_URL, 'https://book.mylimobiz.com/v4/widgets/widget-loader.js');
});

test('ORES embed accepts only the configured official booking destination', () => {
  assert.equal(resolveOresBookingUrl(ORES_HOSTED_URL), ORES_HOSTED_URL);
  assert.equal(resolveOresBookingUrl(`${ORES_HOSTED_URL}/`), ORES_HOSTED_URL);

  for (const value of [
    undefined,
    'http://book.mylimobiz.com/v4/yourbestride',
    'https://book.mylimobiz.com/v4/another-company',
    `${ORES_HOSTED_URL}?passenger=private`,
    'https://example.test/v4/yourbestride',
  ]) {
    assert.equal(resolveOresBookingUrl(value), undefined);
  }
});

test('booking CTAs use the internal integration route', async () => {
  const files = [
    '../src/components/navigation.tsx',
    '../src/components/footer.tsx',
    '../src/app/(frontend)/page.tsx',
    '../src/app/(frontend)/drivers/page.tsx',
    '../src/app/(frontend)/drivers/[slug]/page.tsx',
    '../src/app/(frontend)/fleet/page.tsx',
    '../src/app/(frontend)/fleet/[slug]/page.tsx',
    '../src/app/(frontend)/locations/page.tsx',
    '../src/app/(frontend)/locations/[slug]/page.tsx',
    '../src/app/(frontend)/services/[slug]/page.tsx',
  ];

  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  for (const file of files) {
    const source = await readFile(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
    assert.doesNotMatch(source, /href=\{bookingUrl/);
  }
});

test('widget component uses the official anchor contract exactly once', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/components/limo-anywhere-booking.tsx', import.meta.url)),
    'utf8',
  );

  const anchors = source.match(/<a\b[^>]*data-ores-widget="website"/g) ?? [];
  assert.equal(anchors.length, 1, 'official widget anchor must appear exactly once');
  assert.match(source, /data-ores-alias=\{ORES_ALIAS\}/);
  assert.match(source, /href=\{bookingUrl\}/);
});

test('widget loads the vendor loader through Next.js Script exactly once', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/components/limo-anywhere-booking.tsx', import.meta.url)),
    'utf8',
  );

  const scriptTags = source.match(/<Script\b/g) ?? [];
  assert.equal(scriptTags.length, 1, 'vendor script must be declared exactly once');
  assert.match(source, /src=\{ORES_WIDGET_LOADER_URL\}/);
  assert.match(source, /strategy="afterInteractive"/);
  assert.doesNotMatch(
    source,
    /<script\b[\s>]/,
    'vendor loader must not be rendered as an inline script element',
  );
});

test('widget does not render customer-facing fallback UI or fallback button', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/components/limo-anywhere-booking.tsx', import.meta.url)),
    'utf8',
  );

  assert.doesNotMatch(source, /ores-fallback/);
  assert.doesNotMatch(source, /Open secure booking page/);
  assert.doesNotMatch(source, /If the reservation form does not appear/);
  assert.doesNotMatch(source, /booking_fallback/);
});

test('client navigation reload is guarded against duplicate widget instances', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/components/limo-anywhere-booking.tsx', import.meta.url)),
    'utf8',
  );

  // Reload only happens after the loader already ran once, only for an
  // uninitialized anchor, and only after removing the cached script element.
  assert.match(source, /if \(!window_\[LOADER_RAN_FLAG\]\) return;/);
  assert.match(source, /if \(!anchor \|\| anchor\.dataset\.widgetInitialized === 'true'\) return;/);
  assert.match(source, /document\.getElementById\(SCRIPT_ID\)\?\.remove\(\);/);
});

test('book page gates the embed behind strict URL validation', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/app/(frontend)/book/page.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(
    source,
    /const oresBookingUrl = resolveOresBookingUrl\(bookingUrl\);/,
    'configured URL must pass through the strict resolver',
  );
  assert.match(source, /\{oresBookingUrl \? \(/);
  assert.match(source, /\) : \(/);
});

test('vendor script is scoped to the booking integration only', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { join } = await import('node:path');

  const roots = [
    fileURLToPath(new URL('../src/components/', import.meta.url)),
    fileURLToPath(new URL('../src/app/', import.meta.url)),
  ];

  const walk = async (directory: string): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths: string[] = [];
    for (const entry of entries) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) paths.push(...(await walk(full)));
      else if (/\.(tsx|ts)$/.test(entry.name)) paths.push(full);
    }
    return paths;
  };

  const offenders: string[] = [];
  for (const root of roots) {
    for (const file of await walk(root)) {
      const source = await readFile(file, 'utf8');
      if (/widget-loader\.js|data-ores-widget/.test(source) && !/limo-anywhere-booking/.test(file))
        offenders.push(file);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'vendor widget markup and loader references must stay isolated to the booking component',
  );
});

test('book page delivers unified black container with nested off-white reservation panel and single reservation engine', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/app/(frontend)/book/page.tsx', import.meta.url)),
    'utf8',
  );

  // Single unified black card container with gold eyebrow and approved copy
  assert.match(source, /booking-unified-card/);
  assert.match(source, /PRIVATE CHAUFFEURED TRANSPORTATION/);
  assert.match(source, /Book your ride\./);
  assert.match(
    source,
    /Tell us where you(?:'|&apos;)re going[\s\S]*?compare available vehicles[\s\S]*?complete your[\s\S]*?reservation securely/,
  );

  // Compact inline trust strip with the 3 approved indicators
  assert.match(source, /booking-trust-strip/);
  assert.match(source, /Vehicle choice/);
  assert.match(source, /Live fare calculation/);
  assert.match(source, /Secure booking/);

  // Nested warm off-white reservation panel
  assert.match(source, /booking-panel-nested/);
  assert.match(source, /Your reservation/);
  assert.doesNotMatch(source, /Powered by Limo Anywhere/i, 'provider branding must not be exposed on custom booking page');

  // Single booking form only (no QuickRes)
  const widgetOccurrences = source.match(/<LimoAnywhereBooking\b/g) ?? [];
  assert.equal(widgetOccurrences.length, 1, 'exactly one booking widget must be rendered');
  assert.doesNotMatch(source, /quickres/i, 'QuickRes widget must not be included');

  // Accessible fallback and privacy notices preserved
  assert.doesNotMatch(source, /Payload CMS/i, 'internal technology names must not be exposed on public booking page');
  assert.match(source, /interior-footnote/);
});

test('widget component immediately verifies existing iframe and triggers navigation re-initialization', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/components/limo-anywhere-booking.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(
    source,
    /if \(container\.querySelector\('\.ores4iframe'\)\) \{[\s\S]*?markReady\(\);/,
  );
  assert.match(source, /reinitializeAfterClientNavigation\(\);/);
});

test('ORES theme positions Step 1 passenger controls in left column beneath drop-off and map on right', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const source = await readFile(
    fileURLToPath(new URL('../src/app/(frontend)/book/yourbestride-ores-theme-v6-fixed.css', import.meta.url)),
    'utf8',
  );

  // Desktop grid: Left column (Row 1 fields, Row 2 passengers/counters), Right column (Map)
  assert.match(source, /\.col-sm-6:first-child[^{]*\{[^}]*grid-column:\s*1/);
  assert.match(source, /\.col-sm-6\[style\*='clear'\][^{]*\{[^}]*grid-column:\s*1/);
  assert.match(source, /\.col-sm-6\[style\*='clear'\][^{]*\{[^}]*grid-row:\s*2/);
  assert.match(source, /\.ors-col-map[^{]*\{[^}]*grid-column:\s*2/);

  // Side-by-side counters
  assert.match(source, /PassengerNumber[\s\S]*?display:\s*flex/);

  // Mobile order: 1 = Ride info, 2 = Passengers, 3 = Map
  assert.match(source, /\.col-sm-6:first-child[^{]*\{[^}]*order:\s*1/);
  assert.match(source, /\.col-sm-6\[style\*='clear'\][^{]*\{[^}]*order:\s*2/);
  assert.match(source, /\.ors-col-map[^{]*\{[^}]*order:\s*3/);
});
