import { httpsURL } from './validation';

type Environment = Record<string, string | undefined>;

export function readEnvironment(env: Environment = process.env) {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
  };
  const boolean = (name: string, fallback = false): boolean => {
    const value = env[name];
    if (value === undefined || value === '') return fallback;
    if (value !== 'true' && value !== 'false') throw new Error(`${name} must be true or false`);
    return value === 'true';
  };
  const secret = required('PAYLOAD_SECRET');
  if (secret.length < 32) throw new Error('PAYLOAD_SECRET must contain at least 32 characters');
  const intakeAPISecret = required('INTAKE_API_SECRET');
  if (intakeAPISecret.length < 32)
    throw new Error('INTAKE_API_SECRET must contain at least 32 characters');
  if (intakeAPISecret === secret)
    throw new Error('INTAKE_API_SECRET must be different from PAYLOAD_SECRET');

  const databaseURI = required('DATABASE_URI');
  if (!/^postgres(?:ql)?:\/\//.test(databaseURI))
    throw new Error('DATABASE_URI must be a PostgreSQL connection string');

  const serverURL = required('SITE_URL');
  const parsedServer = new URL(serverURL);
  if (!['http:', 'https:'].includes(parsedServer.protocol) || parsedServer.origin !== serverURL) {
    throw new Error('SITE_URL must be an HTTP(S) origin without a path or trailing slash');
  }
  if (env.NODE_ENV === 'production' && httpsURL(serverURL) !== true)
    throw new Error('SITE_URL must use HTTPS in production');

  const publicURL = required('S3_PUBLIC_URL').replace(/\/+$/, '');
  const parsedPublic = new URL(publicURL);
  if (
    httpsURL(publicURL) !== true ||
    parsedPublic.pathname !== '/' ||
    parsedPublic.search ||
    parsedPublic.hash ||
    parsedPublic.hostname.endsWith('.r2.cloudflarestorage.com')
  ) {
    throw new Error(
      'S3_PUBLIC_URL must be a public HTTPS origin, not the authenticated R2 API endpoint',
    );
  }
  if (env.NODE_ENV === 'production' && parsedPublic.hostname.endsWith('.r2.dev')) {
    throw new Error(
      'Use a Cloudflare R2 custom domain for S3_PUBLIC_URL in production, not r2.dev',
    );
  }
  const endpoint = required('S3_ENDPOINT').replace(/\/+$/, '');
  const parsedEndpoint = new URL(endpoint);
  if (
    httpsURL(endpoint) !== true ||
    parsedEndpoint.origin !== endpoint ||
    !/^[a-f0-9]{32}(?:\.(?:eu|us|fedramp))?\.r2\.cloudflarestorage\.com$/.test(
      parsedEndpoint.hostname,
    )
  ) {
    throw new Error(
      'S3_ENDPOINT must be https://<account-id>.r2.cloudflarestorage.com (or its R2 jurisdiction endpoint)',
    );
  }
  const region = required('S3_REGION');
  if (region !== 'auto') throw new Error('S3_REGION must be auto for Cloudflare R2');

  const cors = (env.CMS_CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of cors) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(
        'CMS_CORS_ORIGINS must contain exact HTTP(S) origins, not paths or wildcards',
      );
    }
    if (env.NODE_ENV === 'production' && parsed.protocol !== 'https:')
      throw new Error('CORS origins must use HTTPS in production');
  }
  const push = boolean('DATABASE_PUSH');
  if (env.NODE_ENV === 'production' && push)
    throw new Error('DATABASE_PUSH cannot be enabled in production');
  boolean('CMS_ALLOW_FIRST_USER');

  return {
    secret,
    intakeAPISecret,
    databaseURI,
    serverURL,
    publicURL,
    endpoint,
    cors,
    push,
    bucket: required('S3_BUCKET'),
    region,
    accessKeyId: required('S3_ACCESS_KEY_ID'),
    secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
  };
}
