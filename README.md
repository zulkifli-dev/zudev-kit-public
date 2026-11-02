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

Set `GITHUB_PACKAGES_TOKEN` in the publishing shell to a classic GitHub PAT with `write:packages`, build the workspace, then publish each package separately. Publish `ui` before `markdown-editor`, because the editor depends on it:

```sh
# Run from the workspace root
bun run build --filter="@zulkifli-dev/*"
cd packages/public/ui && bun publish
cd ../utils && bun publish
cd ../markdown-editor && bun publish
cd ../../private/auth && bun publish
cd ../storage && bun publish
cd ../dashboard && bun publish
cd ../landing-kit && bun publish
cd ../media-editor && bun publish
```

GitHub creates new npm packages as private by default. After publishing each package, open its GitHub package page, choose **Package settings → Change visibility → Public**. The visibility change is irreversible. To install from Bun, the consuming project also needs the scope mapping and a PAT with `read:packages` in its environment, even after the package is public.
