# Zudev Kit Public

Public reusable packages live here and publish independently to npm under the `@zudev` scope. Each package keeps its own semantic version and build output; this repository has one shared Git history.

Current packages:

- `@zudev/ui`
- `@zudev/utils`

From the workspace root, Turborepo builds these packages before dependent app tasks. This repository also has its own Bun workspace manifest, lockfile, and TypeScript configuration so it can be checked independently:

```sh
bun install
bun run build
```

Publish a package only after its version and output are ready; do not publish the whole repository as one package.
