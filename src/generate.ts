import { mkdirSync, rmSync, writeFileSync, cpSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { emitSchema } from './emit';
import { loadSchema, schemaFromDmmf } from './dmmf';
import { resolveConfig, type GeneratorConfig, type SchemaInfo } from './types';

export type GenerateResult = {
	outputDir: string;
	copyTo?: string;
	files: string[];
};

/** Generate from an already-normalized schema (library + Prisma generator). */
export function generateFromSchema(
	schema: SchemaInfo,
	partial: Partial<GeneratorConfig> & { outputDir: string },
): GenerateResult {
	const config = resolveConfig(partial);
	const emitted = emitSchema(schema, config);
	const outputDir = resolve(config.outputDir);

	resetDir(outputDir);
	const written: string[] = [];
	for(const file of emitted) {
		const target = join(outputDir, file.relativePath);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, file.contents, 'utf8');
		written.push(file.relativePath);
	}

	if(config.copyTo) {
		const copyRoot = resolve(config.copyTo);
		resetDir(copyRoot);
		cpSync(outputDir, copyRoot, { recursive: true });
	}

	return {
		outputDir,
		copyTo: config.copyTo ? resolve(config.copyTo) : undefined,
		files: written,
	};
}

/** Generate from a `.prisma` schema path (CLI / tests). */
export async function generateFromSchemaFile(
	schemaPath: string,
	partial: Partial<GeneratorConfig> & { outputDir: string },
): Promise<GenerateResult> {
	const schema = await loadSchema(schemaPath);
	return generateFromSchema(schema, partial);
}

/** Adapter for `@prisma/generator-helper` onGenerate options. */
export function generateFromPrismaOptions(options: {
	dmmf: { datamodel: unknown };
	generator: {
		output?: { value?: string | null } | null;
		config: Record<string, string | string[] | undefined>;
	};
}): GenerateResult {
	const outputDir = options.generator.output?.value;
	if(!outputDir) {
		throw new Error('prisma-type-sync-generator requires an `output` path in the generator block.');
	}

	const config = options.generator.config;
	const schema = schemaFromDmmf(
		options.dmmf.datamodel as Parameters<typeof schemaFromDmmf>[0],
	);

	return generateFromSchema(schema, {
		outputDir,
		copyTo: readConfigString(config, 'copyTo'),
		classSuffix: readConfigString(config, 'classSuffix'),
		swaggerDecorators: readConfigBool(config, 'swaggerDecorators', true),
		includeRelations: readConfigBool(config, 'includeRelations', false),
		banner: readConfigString(config, 'banner'),
	});
}

function readConfigString(
	config: Record<string, string | string[] | undefined>,
	key: string,
): string | undefined {
	const value = config[key];
	if(Array.isArray(value)) {
		return value[0];
	}
	return value;
}

function readConfigBool(
	config: Record<string, string | string[] | undefined>,
	key: string,
	fallback: boolean,
): boolean {
	const raw = readConfigString(config, key);
	if(raw === undefined) {
		return fallback;
	}
	return raw === 'true' || raw === '1' || raw === 'yes';
}

function resetDir(dir: string): void {
	if(existsSync(dir)) {
		rmSync(dir, { recursive: true, force: true });
	}
	mkdirSync(dir, { recursive: true });
}
