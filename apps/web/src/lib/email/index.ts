import 'server-only';

import type {
  ContactFormSubmission,
  DriverApplicationSubmission,
  TransportationInquirySubmission,
} from '@yourbestride/types';

export type IntakeKind = 'transportation' | 'contact' | 'driver';

export type IntakeData =
  | TransportationInquirySubmission
  | ContactFormSubmission
  | DriverApplicationSubmission;

export type IntakeNotification = {
  kind: IntakeKind;
  sourcePage: string;
  data: IntakeData;
};

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_TIMEOUT_MS = 5_000;

export function createResendProvider(apiKey: string, fetcher: typeof fetch = fetch): EmailProvider {
  return {
    async send(message) {
      const response = await fetcher(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    },
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function title(kind: IntakeKind): string {
  if (kind === 'transportation') return 'Transportation inquiry';
  if (kind === 'driver') return 'Driver application';
  return 'Contact message';
}

export function formatIntakeNotification(
  notification: IntakeNotification,
): Omit<EmailMessage, 'from' | 'to'> {
  const entries = Object.entries(notification.data).filter(
    ([, value]) => value !== undefined && value !== '',
  );
  const name =
    'fullName' in notification.data ? notification.data.fullName : notification.data.name;
  const email = notification.data.email;
  const heading = title(notification.kind);
  const textFields = entries.map(([key, value]) => `${key}: ${String(value)}`).join('\n');
  const htmlFields = entries
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');

  return {
    subject: `New ${heading.toLowerCase()} from ${name}`,
    replyTo: email,
    text: `${heading}\nSource page: ${notification.sourcePage}\n\n${textFields}`,
    html: `<h1>${escapeHtml(heading)}</h1><p><strong>Source page:</strong> ${escapeHtml(notification.sourcePage)}</p><dl>${htmlFields}</dl>`,
  };
}

export async function sendIntakeNotification(
  notification: IntakeNotification,
  options: { env?: Record<string, string | undefined>; provider?: EmailProvider } = {},
): Promise<void> {
  const env = options.env ?? process.env;
  const { RESEND_API_KEY, EMAIL_FROM, NOTIFICATION_EMAIL } = env;
  if (!RESEND_API_KEY || !EMAIL_FROM || !NOTIFICATION_EMAIL) {
    if (env.NODE_ENV !== 'production') return;
    throw new Error('Email notification is not configured');
  }

  const provider = options.provider ?? createResendProvider(RESEND_API_KEY);
  await provider.send({
    from: EMAIL_FROM,
    to: NOTIFICATION_EMAIL,
    ...formatIntakeNotification(notification),
  });
}
