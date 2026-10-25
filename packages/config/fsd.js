import boundaries from 'eslint-plugin-boundaries'

// FSD layers (ARCHITECTURE.md#mobile-layers, #92, #116). Imports go down only, and into another slice only through its index
// file. Each app passes its own folders: `root` holds the layers (mobile `src`, web `app`), `routes` are the framework route
// files (outside the layers), and the FSD app layer is the `shell` folder in `root` (Expo Router and React Router both reserve
// `app/` for routes). steiger checks the folder structure (steiger.js).
const index = 'index.{ts,tsx}'
const layers = ['pages', 'widgets', 'features', 'entities', 'shared']

/**
 * @param {object} o
 * @param {string[]} o.files Globs the rule runs on.
 * @param {string} o.root Folder that holds the layers, relative to the app.
 * @param {{ pattern: string | string[]; partialMatch?: boolean; mode?: 'file' | 'folder' }[]} o.routes Route files.
 * @param {string[]} o.routeMayImport Layers a route file may import (shell, pages, widgets, features, entities, shared).
 * @param {string[]} o.sharedEntries Segments of `shared` whose every file is a public entry. The other segments need an index.
 * @param {string} [o.generated] Folder of generated code, readable by features and shared.
 * @param {string} [o.rootPath] App folder that the patterns are relative to. Default: the working directory (ESLint run from the app).
 * @returns {import('eslint').Linter.Config[]}
 */
export function fsdLayers({ files, root, routes, routeMayImport, sharedEntries, generated, rootPath }) {
  const below = {
    shell: layers,
    pages: layers.slice(1),
    widgets: layers.slice(2),
    features: [...layers.slice(3), ...(generated ? ['generated'] : [])],
    entities: layers.slice(4),
    shared: [],
    route: routeMayImport,
  }
  return [
    {
      files,
      plugins: { boundaries },
      settings: {
        ...(rootPath ? { 'boundaries/root-path': rootPath } : {}),
        'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
        'boundaries/elements': [
          ...routes.map((r) => ({ type: 'route', ...r })),
          { type: 'shell', pattern: `${root}/shell` },
          ...(generated ? [{ type: 'generated', pattern: generated }] : []),
          ...layers.map((type) => ({ type, pattern: `${root}/${type}/*`, capture: ['slice'] })),
        ],
      },
      rules: {
        'boundaries/dependencies': [
          'error',
          {
            default: 'disallow',
            policies: [
              {
                from: { element: { type: '*' } },
                allow: {
                  to: {
                    element: {
                      type: '{{ from.element.type }}',
                      captured: { slice: '{{ from.element.captured.slice }}' },
                    },
                  },
                },
              },
              // shared has segments, not slices: they may use each other's files
              {
                from: { element: { type: 'shared' } },
                allow: { to: { element: { type: ['shared', ...(generated ? ['generated'] : [])] } } },
              },
              ...Object.entries(below).map(([from, to]) => ({
                from: { element: { type: from } },
                allow: [
                  {
                    to: {
                      element: {
                        type: to.filter((t) => !(from === 'route' && t === 'shared')),
                        fileInternalPath: index,
                      },
                    },
                  },
                  ...(to.includes('shared')
                    ? [{ to: { element: { type: 'shared', captured: { slice: sharedEntries } } } }]
                    : []),
                  ...(to.includes('generated') ? [{ to: { element: { type: 'generated' } } }] : []),
                ],
              })),
            ],
          },
        ],
      },
    },
  ]
}
