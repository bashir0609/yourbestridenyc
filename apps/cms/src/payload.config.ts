import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import {
  BlogPosts,
  Drivers,
  FleetVehicles,
  Locations,
  Pages,
  Services,
  Testimonials,
} from './collections/Editorial';
import { DriverApplications, TransportationLeads } from './collections/Intake';
import { Media } from './collections/Media';
import { Users } from './collections/Users';
import { readEnvironment } from './env';
import { createR2StorageOptions } from './storage';
import { Footer, Navigation } from './globals/Navigation';
import { SiteSettings } from './globals/SiteSettings';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const env = readEnvironment();

export default buildConfig({
  telemetry: false,
  secret: env.secret,
  serverURL: env.serverURL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: dirname,
      autoGenerate: false,
      importMapFile: path.resolve(dirname, 'app/(payload)/admin/importMap.ts'),
    },
    meta: { titleSuffix: '— YourBestRide CMS' },
  },
  cors: [env.serverURL, ...env.cors],
  // Marketing origins may read public content, but must not make cookie-authenticated mutations.
  csrf: [env.serverURL],
  editor: lexicalEditor(),
  sharp,
  collections: [
    Users,
    Media,
    Pages,
    Services,
    Drivers,
    FleetVehicles,
    Testimonials,
    Locations,
    BlogPosts,
    TransportationLeads,
    DriverApplications,
  ],
  globals: [SiteSettings, Navigation, Footer],
  db: postgresAdapter({
    pool: { connectionString: env.databaseURI, max: 10 },
    push: env.push,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  graphQL: {
    disablePlaygroundInProduction: true,
    disableIntrospectionInProduction: true,
    maxComplexity: 100,
  },
  defaultDepth: 1,
  maxDepth: 3,
  upload: { limits: { fileSize: 4 * 1024 * 1024 }, abortOnLimit: true },
  typescript: {
    autoGenerate: false,
    outputFile: path.resolve(dirname, '../../../packages/types/src/payload-types.ts'),
  },
  plugins: [s3Storage(createR2StorageOptions(env))],
});
