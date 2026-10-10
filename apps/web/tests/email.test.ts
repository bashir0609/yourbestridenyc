import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createResendProvider,
  formatIntakeNotification,
  sendIntakeNotification,
  type EmailMessage,
} from '../src/lib/email';

test('notification formatting escapes submitted HTML', () => {
  const message = formatIntakeNotification({
    kind: 'contact',
    sourcePage: '<home>',
    data: {
      name: '<script>alert(1)</script>',
      email: 'person@example.com',
      phone: '+1 202 555 0123',
      message: '<b>hello</b>',
    },
  });
  assert.doesNotMatch(message.html, /<script>|<b>/);
  assert.match(message.html, /&lt;script&gt;/);
  assert.equal(message.replyTo, 'person@example.com');
});

test('Resend provider sends credentials only to the fixed endpoint', async () => {
  let url = '';
  let init: RequestInit | undefined;
  const provider = createResendProvider('secret-key', async (input, requestInit) => {
    url = String(input);
    init = requestInit;
    return new Response('{}', { status: 200 });
  });
  await provider.send({
    from: 'from@example.com',
    to: 'to@example.com',
    subject: 'Test',
    text: 'Text',
    html: '<p>Text</p>',
  });
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer secret-key');
});

test('email is optional outside production, fails closed in production, and sends when configured', async () => {
  await sendIntakeNotification(
    {
      kind: 'contact',
      sourcePage: '/',
      data: {
        name: 'Alex',
        email: 'alex@example.com',
        phone: '+12025550123',
        message: 'A useful message here.',
      },
    },
    { env: { NODE_ENV: 'development' } },
  );
  await assert.rejects(
    sendIntakeNotification(
      {
        kind: 'contact',
        sourcePage: '/',
        data: {
          name: 'Alex',
          email: 'alex@example.com',
          phone: '+12025550123',
          message: 'A useful message here.',
        },
      },
      { env: { NODE_ENV: 'production' } },
    ),
    /not configured/,
  );

  let sent: EmailMessage | undefined;
  await sendIntakeNotification(
    {
      kind: 'contact',
      sourcePage: '/',
      data: {
        name: 'Alex',
        email: 'alex@example.com',
        phone: '+12025550123',
        message: 'A useful message here.',
      },
    },
    {
      env: {
        RESEND_API_KEY: 'key',
        EMAIL_FROM: 'from@example.com',
        NOTIFICATION_EMAIL: 'team@example.com',
      },
      provider: {
        async send(message) {
          sent = message;
        },
      },
    },
  );
  assert.equal(sent?.to, 'team@example.com');
});
