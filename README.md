# Zudev Kit Public

Public reusable packages live here and publish independently to GitHub Packages under the `@zulkifli-dev` scope. Each package keeps its own semantic version and build output; this repository has one shared Git history. `@zulkifli-dev/ui` provides the Tailwind CSS v4 theme and shadcn-style components for the other packages.

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

## Publish to GitHub Packages

Run the **Publish GitHub Packages** workflow from the Actions tab. It builds the workspace and publishes each package separately, with `ui` first because `markdown-editor` depends on it. The workflow uses the repository's `GITHUB_TOKEN` with `packages: write`.

```sh
# Manual alternative: run from this repository's root
bun install
bun run build
cd ui && bun publish
cd ../utils && bun publish
cd ../markdown-editor && bun publish
```

GitHub creates new npm packages as private by default. After publishing, open each package page and choose **Package settings → Change visibility → Public**. This is irreversible. Bun still requires a PAT with `read:packages` to install these packages, even after they are public.
