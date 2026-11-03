#!/usr/bin/env node
import { generatorHandler } from '@prisma/generator-helper';
import { generateFromPrismaOptions } from './generate';

generatorHandler({
	onManifest() {
		return {
			defaultOutput: '../src/generated/type-sync',
			prettyName: 'Prisma Type Sync Generator',
			version: '0.1.0',
		};
	},
	async onGenerate(options) {
		const result = generateFromPrismaOptions(options);
		process.stdout.write(
			`prisma-type-sync-generator: wrote ${result.files.length} file(s) to ${result.outputDir}`
			+ (result.copyTo ? ` (copied to ${result.copyTo})` : '')
			+ '\n',
		);
	},
});
