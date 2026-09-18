# Local project profiles

Committed `*.example.json` files are templates. Copy one to a matching
`*.local.json` and fill in real paths / nx project names.

`*.local.json` is gitignored — it points at a checkout that does not belong in
this repo.

| File | Use |
|------|-----|
| `nx-angular-private.example.json` | Template for pointing the harness at a private nx-Angular app |
| `nx-angular-private.local.json` | Your machine's copy (not committed) |

The default profile remains `nx-angular` (sandbox fixture) so CI and acceptance
stay green without this file.

See [M6 — Port to real repo](../../plans/M6-port-real-repo.md) and
[harness/README.md](../README.md#point-at-a-private-checkout-m6).
