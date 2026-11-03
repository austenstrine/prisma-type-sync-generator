import { readFileSync } from 'fs';
import { getDMMF } from '@prisma/internals';
import type { EnumInfo, ModelFieldInfo, ModelInfo, SchemaInfo } from './types';

type DmmfFieldLike = {
	name: string;
	kind: string;
	type: string;
	isRequired: boolean;
	isList: boolean;
	isId: boolean;
	hasDefaultValue: boolean;
	isUpdatedAt: boolean;
};

type DmmfModelLike = {
	name: string;
	fields: ReadonlyArray<DmmfFieldLike>;
};

type DmmfEnumLike = {
	name: string;
	values: ReadonlyArray<{ name: string }>;
};

type DmmfDatamodelLike = {
	models: ReadonlyArray<DmmfModelLike>;
	enums: ReadonlyArray<DmmfEnumLike>;
};

/** Load models/enums from a Prisma schema file (CLI / tests). */
export async function loadSchema(schemaPath: string): Promise<SchemaInfo> {
	const datamodel = readFileSync(schemaPath, 'utf8');
	const dmmf = await getDMMF({ datamodel });
	return schemaFromDmmf(dmmf.datamodel as DmmfDatamodelLike);
}

/** Normalize generator or internals DMMF datamodel into SchemaInfo. */
export function schemaFromDmmf(datamodel: DmmfDatamodelLike): SchemaInfo {
	const models: ModelInfo[] = datamodel.models.map((model) => ({
		name: model.name,
		fields: model.fields.map((field): ModelFieldInfo => ({
			name: field.name,
			kind: normalizeKind(field.kind),
			type: field.type,
			isRequired: Boolean(field.isRequired),
			isList: Boolean(field.isList),
			isId: Boolean(field.isId),
			hasDefault: Boolean(field.hasDefaultValue),
			isUpdatedAt: Boolean(field.isUpdatedAt),
		})),
	}));

	const enums: EnumInfo[] = datamodel.enums.map((item) => ({
		name: item.name,
		values: item.values.map((value) => value.name),
	}));

	return { models, enums };
}


function normalizeKind(kind: string): ModelFieldInfo['kind'] {
	if(kind === 'scalar' || kind === 'enum' || kind === 'object' || kind === 'unsupported') {
		return kind;
	}
	return 'unsupported';
}
