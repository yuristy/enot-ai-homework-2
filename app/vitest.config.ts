import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // `supabaseClient.ts` builds the client at module load, and `createClient`
    // throws "supabaseUrl is required." on empty values — so any test that imports
    // that module needs a syntactically valid pair. These are dummies: no test
    // touches the network.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
