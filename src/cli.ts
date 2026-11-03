#!/usr/bin/env node
import { resolve } from 'path';
import { generateFromSchemaFile } from './generate';
import { DEFAULT_BANNER, DEFAULT_CLASS_SUFFIX } from './types';

type CliArgs = {
	schema: string;
	out: string;
	copyTo?: string;
	classSuffix: string;
	swaggerDecorators: boolean;
	includeRelations: boolean;
	help: boolean;
};

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		schema: 'prisma/schema.prisma',
		out: 'src/generated/type-sync',
		classSuffix: DEFAULT_CLASS_SUFFIX,
		swaggerDecorators: true,
		includeRelations: false,
		help: false,
	};

	for(let i = 0; i < argv.length; i += 1) {
		const token = argv[i];
		const next = () => {
			i += 1;
			return argv[i];
		};

		switch(token) {
			case '-h':
			case '--help':
				args.help = true;
				break;
			case '--schema':
				args.schema = next() ?? args.schema;
				break;
			case '--out':
			case '--output':
				args.out = next() ?? args.out;
				break;
			case '--copy-to':
				args.copyTo = next();
				break;
			case '--class-suffix':
				args.classSuffix = next() ?? args.classSuffix;
				break;
			case '--no-swagger':
				args.swaggerDecorators = false;
				break;
			case '--include-relations':
				args.includeRelations = true;
				break;
			default:
				if(token.startsWith('-')) {
					throw new Error(`Unknown flag: ${token}`);
				}
		}
	}

	return args;
}

function printHelp(): void {
	const text = [
		'prisma-type-sync — emit Swagger-decorated model bases from a Prisma schema',
		'',
		'Usage:',
		'  prisma-type-sync --schema prisma/schema.prisma --out src/generated/type-sync',
		'',
		'Options:',
		'  --schema <path>          Prisma schema file (default: prisma/schema.prisma)',
		'  --out, --output <dir>    Output directory',
		'  --copy-to <dir>          Optional second destination (e.g. frontend generated types)',
		`  --class-suffix <name>    Class suffix (default: ${DEFAULT_CLASS_SUFFIX})`,
		'  --no-swagger             Emit plain TypeScript classes (no Nest/Swagger decorators)',
		'  --include-relations      Include Prisma relation object fields (skeleton only)',
		'  -h, --help               Show this help',
		'',
		`Banner: ${DEFAULT_BANNER}`,
		'',
	].join('\n');
	process.stdout.write(text);
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if(args.help) {
		printHelp();
		return;
	}

	const result = await generateFromSchemaFile(resolve(args.schema), {
		outputDir: resolve(args.out),
		copyTo: args.copyTo ? resolve(args.copyTo) : undefined,
		classSuffix: args.classSuffix,
		swaggerDecorators: args.swaggerDecorators,
		includeRelations: args.includeRelations,
	});

	process.stdout.write(
		`Wrote ${result.files.length} file(s) to ${result.outputDir}`
		+ (result.copyTo ? `\nCopied to ${result.copyTo}` : '')
		+ '\n',
	);
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`prisma-type-sync-generator: ${message}\n`);
	process.exitCode = 1;
});
