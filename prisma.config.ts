import 'dotenv/config'

import { defineConfig, env } from 'prisma/config'

/**
 * Prisma 7 reads the connection string from here rather than from the schema
 * file. The running app builds its own adapter in src/lib/prisma.ts; this block
 * is what `prisma migrate` and `prisma studio` use.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
