import type { GeneratorConfig, ModelFieldInfo, ModelInfo, SchemaInfo } from './types';
import { mapPrismaType, refineIdValidators } from './map-scalar';

export type EmittedFile = {
	relativePath: string;
	contents: string;
};

/** Build the full set of generated TypeScript files for a schema. */
export function emitSchema(schema: SchemaInfo, config: GeneratorConfig): EmittedFile[] {
	const files: EmittedFile[] = [];
	const enumNames = new Set(schema.enums.map((e) => e.name));

	for(const enumInfo of schema.enums) {
		files.push({
			relativePath: `enums/${enumInfo.name}.ts`,
			contents: emitEnumFile(enumInfo.name, enumInfo.values, config.banner),
		});
	}

	for(const model of schema.models) {
		files.push({
			relativePath: `models/${model.name}${config.classSuffix}.ts`,
			contents: emitModelClass(model, config, enumNames),
		});
	}

	files.push({
		relativePath: 'index.ts',
		contents: emitIndex(schema, config),
	});

	return files;
}

export function emitEnumFile(name: string, values: string[], banner: string): string {
	const lines = [
		`// ${banner}`,
		'',
		`export enum ${name} {`,
		...values.map((value) => `\t${value} = '${value}',`),
		'}',
		'',
	];
	return lines.join('\n');
}

export function emitModelClass(
	model: ModelInfo,
	config: GeneratorConfig,
	enumNames: Set<string>,
): string {
	const className = `${model.name}${config.classSuffix}`;
	const fields = model.fields.filter((field) => shouldIncludeField(field, config));

	const importNeeds = collectImports(fields, config, enumNames);
	const body = fields.map((field) => emitField(field, config)).join('\n\n');

	const lines: string[] = [
		`// ${config.banner}`,
		'',
		...importNeeds,
		importNeeds.length > 0 ? '' : null,
		`/** Generated base for Prisma model \`${model.name}\`. Extend or Pick/Omit in hand-written DTOs. */`,
		`export class ${className} {`,
		body || '\t// no scalar fields',
		'}',
		'',
	].filter((line): line is string => line !== null);

	return lines.join('\n');
}

function shouldIncludeField(field: ModelFieldInfo, config: GeneratorConfig): boolean {
	if(field.kind === 'unsupported') {
		return false;
	}
	if(field.kind === 'object') {
		return config.includeRelations;
	}
	return field.kind === 'scalar' || field.kind === 'enum';
}

function collectImports(
	fields: ModelFieldInfo[],
	config: GeneratorConfig,
	enumNames: Set<string>,
): string[] {
	if(!config.swaggerDecorators) {
		const enumsUsed = [...new Set(fields.filter((f) => f.kind === 'enum').map((f) => f.type))];
		return enumsUsed.map((name) => `import { ${name} } from '../enums/${name}';`);
	}

	const swagger = new Set<string>();
	const validators = new Set<string>();
	let needsType = false;
	const enumsUsed = new Set<string>();

	for(const field of fields) {
		const kind = field.kind === 'enum' ? 'enum' : field.kind === 'scalar' ? 'scalar' : 'object';
		if(kind === 'object') {
			continue;
		}
		if(field.kind === 'enum') {
			enumsUsed.add(field.type);
		}

		const hint = mapPrismaType(field.type, kind, field.isList);
		const validatorsForField = refineIdValidators(
			field.name,
			field.isId,
			field.type,
			hint.validators,
		);

		if(field.isRequired) {
			swagger.add('ApiProperty');
		}
		else {
			swagger.add('ApiPropertyOptional');
			validators.add('IsOptional');
		}

		for(const v of validatorsForField) {
			if(v.startsWith('Type(')) {
				needsType = true;
				continue;
			}
			const name = v.replace(/\(.*/, '');
			validators.add(name);
		}
	}

	const lines: string[] = [];
	if(swagger.size > 0) {
		lines.push(`import { ${[...swagger].sort().join(', ')} } from '@nestjs/swagger';`);
	}
	if(validators.size > 0) {
		lines.push(
			`import { ${[...validators].sort().join(', ')} } from 'class-validator';`,
		);
	}
	if(needsType) {
		lines.push(`import { Type } from 'class-transformer';`);
	}
	for(const name of [...enumsUsed].sort()) {
		if(enumNames.has(name)) {
			lines.push(`import { ${name} } from '../enums/${name}';`);
		}
	}
	return lines;
}

function emitField(field: ModelFieldInfo, config: GeneratorConfig): string {
	const kind = field.kind === 'enum' ? 'enum' : field.kind === 'scalar' ? 'scalar' : 'object';
	if(kind === 'object') {
		const optional = field.isRequired ? '' : '?';
		const list = field.isList ? '[]' : '';
		return `\t${field.name}${optional}: ${field.type}${list};`;
	}

	const hint = mapPrismaType(field.type, kind, field.isList);
	let validators = refineIdValidators(field.name, field.isId, field.type, hint.validators);
	if(!field.isRequired) {
		validators = ['IsOptional()', ...validators];
	}

	const decorators: string[] = [];
	if(config.swaggerDecorators) {
		const apiName = field.isRequired ? 'ApiProperty' : 'ApiPropertyOptional';
		const opts: string[] = [];
		if(hint.apiPropertyType) {
			opts.push(`type: ${hint.apiPropertyType}`);
		}
		if(hint.apiFormat) {
			opts.push(`format: '${hint.apiFormat}'`);
		}
		if(field.isList) {
			opts.push('isArray: true');
		}
		decorators.push(opts.length > 0 ? `@${apiName}({ ${opts.join(', ')} })` : `@${apiName}()`);
		for(const v of validators) {
			decorators.push(`@${v}`);
		}
	}

	const optionalMark = field.isRequired ? '!' : '?';
	const typeAnnot = field.isRequired ? hint.tsType : `${hint.tsType} | null`;
	const decoBlock = decorators.map((d) => `\t${d}`).join('\n');
	const fieldLine = `\t${field.name}${optionalMark}: ${typeAnnot};`;
	return decoBlock ? `${decoBlock}\n${fieldLine}` : fieldLine;
}

function emitIndex(schema: SchemaInfo, config: GeneratorConfig): string {
	const lines = [
		`// ${config.banner}`,
		'',
		...schema.enums.map((e) => `export { ${e.name} } from './enums/${e.name}';`),
		...schema.models.map(
			(m) => `export { ${m.name}${config.classSuffix} } from './models/${m.name}${config.classSuffix}';`,
		),
		'',
	];
	return lines.join('\n');
}
