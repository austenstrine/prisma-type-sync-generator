# prisma-type-sync-generator

**Status: early / experimental (v0.1).** APIs, emitted shapes, and decorator choices will change. Do not treat generated output as production-ready without review.

Prisma **custom generator** + small **CLI** that turns Prisma models into TypeScript **Swagger-decorated model base classes** (NestJS `@ApiProperty` / `class-validator`) and shared enum files. Hand-written DTOs can extend, `Pick`, or `Omit` these bases. An optional `copyTo` path mirrors the same tree for a frontend consumer.

Intended first consumer: [Place et Marque / austenstrine_portfolio](https://github.com/austenstrine/austenstrine_portfolio) (`PrismaTypescriptTypeGenerator` in `next steps` / CV copy). **This repo is greenfield** — the portfolio does **not** depend on it yet.

## What works now

- Emit one `*ModelBase` class per Prisma model (scalars + enums; relations skipped by default).
- Nest Swagger + class-validator (+ `class-transformer` `Type` for `DateTime`) decorator stubs.
- Prisma enum → TypeScript `enum` files.
- Library API, CLI (`prisma-type-sync`), and Prisma generator entry (`prisma-type-sync-generator`).
- Optional second output directory via `--copy-to` / generator `copyTo`.

## What is intentionally left for later

- Nest/Next portfolio wiring (`prepare:api-types`, CI, real DTO inheritance).
- Partial/complete DTO variants (`Create*`, `Update*`, response classes).
- Frontend-safe emit (strip Nest imports or dual targets).
- Helpers to coerce DTO payloads into Prisma `where` / `data` clauses (CV blurb).
- Relation field graphs, Decimal/Bytes fidelity, `@db.*` attributes, documentation comments.
- Published npm release + semver guarantees.

## Install (local / git)

```bash
npm install github:austenstrine/prisma-type-sync-generator#semver:^0.1.0
# or clone and npm link / file: dependency while iterating
```

Peer: `prisma` ≥ 5. Generated Nest files expect `@nestjs/swagger`, `class-validator`, and `class-transformer` in the **consuming** app (not bundled here).

## Prisma generator

```prisma
generator typeSync {
  provider = "prisma-type-sync-generator"
  output   = "../src/generated/type-sync"
  // optional:
  // copyTo             = "../../web/src/generated/type-sync"
  // classSuffix         = "ModelBase"
  // swaggerDecorators   = "true"
  // includeRelations    = "false"
}
```

Then:

```bash
npx prisma generate
```

## CLI

```bash
npx prisma-type-sync --schema prisma/schema.prisma --out src/generated/type-sync
npx prisma-type-sync --schema prisma/schema.prisma --out api/generated --copy-to web/generated
npx prisma-type-sync --help
```

## Library

```ts
import { generateFromSchemaFile } from 'prisma-type-sync-generator';

await generateFromSchemaFile('prisma/schema.prisma', {
  outputDir: 'src/generated/type-sync',
});
```

## Portfolio consumption (planned, not wired)

| Step | Where |
|------|--------|
| Depend on this package | `apps/api` (workspace or git/npm) |
| Add `generator typeSync` | `apps/api/prisma/schema.prisma` |
| Import bases in Nest DTOs | `apps/api/src/**/dto` |
| Optional frontend mirror | `copyTo` → `apps/web/src/generated/type-sync` |
| Hook generate | extend root `prepare:api-types` / CI after `prisma generate` |

Until then, keep inventing DTOs by hand in the portfolio. Wiring should be a thin, non-breaking follow-up once emit quality is good enough.

## Develop

```bash
npm install
npm test
npm run build
```

## License

MIT
