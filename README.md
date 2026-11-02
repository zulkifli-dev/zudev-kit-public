# Zudev Kit Public

Public reusable packages live here and publish to the npm public registry under the `@zulkifli-dev` scope. Each package keeps its own semantic version and build output; this repository has one shared Git history. `@zulkifli-dev/ui` provides the Tailwind CSS v4 theme and shadcn-style components for the other packages.

Current packages:

- `@zulkifli-dev/ui`
- `@zulkifli-dev/utils`
- `@zulkifli-dev/markdown-editor`

From the workspace root, Turborepo builds these packages before dependent app tasks. This repository also has its own Bun workspace manifest, lockfile, and TypeScript configuration so it can be checked independently:

```sh
bun install
bun run build
```

Apps should import `@zulkifli-dev/ui/styles.css` (or a feature package stylesheet that imports it) and use Tailwind CSS v4. Tailwind scans the UI package components through the stylesheet's `@source` directive.

## Publish to npm with Bun

Make sure the npm account owns the `@zulkifli-dev` scope. Set an npm granular access token as `NPM_CONFIG_TOKEN` in the publishing environment, then run:

```sh
bun install
bun run build
bun publish --recursive --access public
```

This publishes all three packages from this repository. The Actions workflow uses the `NPM_TOKEN` repository secret. Publish this kit before `zudev-kit-private`, because its `dashboard` and `landing-kit` packages depend on `@zulkifli-dev/ui`.
