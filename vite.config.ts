import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
// vitest/config re-exports defineConfig with the `test` block typed.
import { defineConfig } from 'vitest/config'

// `import.meta.dirname` rather than `__dirname`: Vite 8's native config loader
// does not provide the CommonJS globals, and warns that it will stop tolerating
// them.
const here = import.meta.dirname

/* The emitted stylesheet's name, stated once.
 *
 * In library mode Vite derives the CSS filename from the *package name*, so
 * renaming the package silently renames the file — and the `exports` map in
 * package.json goes on pointing at the old one. That is a 404 for every
 * consumer's `import '.../styles.css'`, with nothing failing at build time to
 * say so. Pinning the name here decouples the two: the package can be renamed
 * again and this file will not move. */
const STYLESHEET = 'navigator-ux.css'

export default defineConfig({
  // `rollupTypes` bundles the public API into one index.d.ts, which is what
  // `types` points at, but it leaves the per-file declarations beside it. Copy
  // source declarations too: the rolled-up entry and client declaration both
  // import the generated OpenAPI schema as `./api/schema`.
  plugins: [
    react(),
    dts({ include: ['src'], exclude: ['src/test', 'src/cli'], copyDtsFiles: true, rollupTypes: true }),
  ],
  build: {
    lib: {
      // `testing/*` is a separate entry so nothing in it — axe, Vitest hooks —
      // can reach an application bundle through the main one.
      entry: {
        index: resolve(here, 'src/index.ts'),
        'testing/index': resolve(here, 'src/testing/index.ts'),
        'testing/setup': resolve(here, 'src/testing/setup.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entry) => `${entry}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      // React is supplied by the consuming app, never bundled here.
      //
      // The runtime dependencies are external for a different reason: they are
      // real `dependencies`, so a consumer's installer already resolves them,
      // and bundling a copy here would mean an app that also uses d3 ships two.
      // Externalizing is what lets the package manager dedupe. It also keeps
      // `check:bundle` meaningful — that gate reads `dist` for off-origin
      // references, and inlining ~1 MB of vendor code would bury the signal.
      external: (id) =>
        id === 'react' ||
        id === 'react-dom' ||
        id === 'react/jsx-runtime' ||
        id.startsWith('d3-') ||
        id === 'topojson-client' ||
        id.startsWith('topojson-client/') ||
        id === 'pdfjs-dist' ||
        id.startsWith('pdfjs-dist/') ||
        // The testing entry's optional peers: the consumer's own copies.
        id === 'axe-core' ||
        id === 'vitest' ||
        id === '@testing-library/react',
      output: {
        globals: { react: 'React', 'react-dom': 'ReactDOM' },
        // Emit assets under stable, unhashed names so the `exports` map can
        // point at them. The stylesheet is pinned outright; everything else
        // keeps the name it arrived with.
        assetFileNames: (asset) =>
          asset.names?.some((name) => name.endsWith('.css'))
            ? STYLESHEET
            : (asset.names?.[0] ?? '[name][extname]'),
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Scoped to src rather than left to Vitest's default glob. The package
    // root is now the repository root, so the default would also match any
    // checkout sitting inside it — a git worktree under .claude/, say, whose
    // copy of an older suite then runs and fails against today's source.
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx,mjs}'],
      exclude: [
        'src/test/**',
        // Re-exports only. Importing it in a test would score 100% without
        // exercising anything, so counting it either way is noise.
        'src/index.ts',
        'src/api/schema.d.ts',
      ],
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
})
