import assert from 'assert';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateFromSchemaFile } from '../src/generate';

async function main(): Promise<void> {
	const root = mkdtempSync(join(tmpdir(), 'prisma-type-sync-'));
	const out = join(root, 'out');
	const copyTo = join(root, 'frontend-copy');
	const schema = join(__dirname, 'fixtures', 'schema.prisma');

	try {
		const result = await generateFromSchemaFile(schema, {
			outputDir: out,
			copyTo,
		});

		assert.ok(result.files.includes('models/ProjectModelBase.ts'));
		assert.ok(result.files.includes('models/UserModelBase.ts'));
		assert.ok(result.files.includes('enums/Role.ts'));
		assert.ok(result.files.includes('index.ts'));

		const projectSrc = readFileSync(join(out, 'models/ProjectModelBase.ts'), 'utf8');
		assert.match(projectSrc, /from '@nestjs\/swagger'/);
		assert.match(projectSrc, /export class ProjectModelBase/);
		assert.doesNotMatch(projectSrc, /\bowner\b/);

		const userSrc = readFileSync(join(out, 'models/UserModelBase.ts'), 'utf8');
		assert.match(userSrc, /import \{ Role \} from '\.\.\/enums\/Role'/);
		assert.match(userSrc, /@IsEnum\(Role\)/);
		assert.match(userSrc, /role!: Role;/);

		const indexSrc = readFileSync(join(out, 'index.ts'), 'utf8');
		assert.match(indexSrc, /ProjectModelBase/);
		assert.match(indexSrc, /UserModelBase/);
		assert.match(indexSrc, /Role/);

		assert.ok(existsSync(join(copyTo, 'models/ProjectModelBase.ts')));
		assert.ok(existsSync(join(copyTo, 'index.ts')));

		process.stdout.write('generate.test.ts: ok\n');
	}
	finally {
		rmSync(root, { recursive: true, force: true });
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
