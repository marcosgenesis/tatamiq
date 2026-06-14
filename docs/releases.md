# Releases

Tatamiq uses semantic-release for semantic versioning.

## Versioning model

The repository has a single product release version, published from Git tags like `v1.2.3`.

Release type is inferred from Conventional Commits on `main`:

- `fix:` -> patch
- `feat:` -> minor
- `BREAKING CHANGE:` or `!` -> major

Commits like `chore:`, `docs:`, `test:`, and `ci:` do not create a release by default.

## Release flow

1. Merge Conventional Commit messages into `main`.
2. GitHub Actions runs `semantic-release`.
3. The action calculates the next version.
4. It creates the Git tag and GitHub release.
5. It updates `CHANGELOG.md`.

## First release bootstrap

If you want the first automated release to start from `0.x`, create an initial tag first:

```bash
git tag -a v0.0.0 -m "Bootstrap semantic-release"
git push origin v0.0.0
```

Without an initial tag, semantic-release will determine the first release from repository history.

## Useful commands

```bash
pnpm release:dry-run
pnpm release
```
