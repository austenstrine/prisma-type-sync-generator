export type TsTypeHint = {
	tsType: string;
	apiPropertyType?: string;
	apiFormat?: string;
	validators: string[];
};

/** Map a Prisma scalar/enum field type to TypeScript + decorator hints. */
export function mapPrismaType(
	prismaType: string,
	kind: 'scalar' | 'enum' | 'object' | 'unsupported',
	isList: boolean,
): TsTypeHint {
	let hint: TsTypeHint;

	if(kind === 'enum') {
		hint = {
			tsType: prismaType,
			apiPropertyType: 'String',
			validators: [`IsEnum(${prismaType})`],
		};
	}
	else {
		switch(prismaType) {
			case 'String':
				hint = { tsType: 'string', apiPropertyType: 'String', validators: ['IsString()'] };
				break;
			case 'Boolean':
				hint = { tsType: 'boolean', apiPropertyType: 'Boolean', validators: ['IsBoolean()'] };
				break;
			case 'Int':
			case 'BigInt':
				hint = { tsType: 'number', apiPropertyType: 'Number', validators: ['IsInt()'] };
				break;
			case 'Float':
			case 'Decimal':
				hint = { tsType: 'number', apiPropertyType: 'Number', validators: ['IsNumber()'] };
				break;
			case 'DateTime':
				hint = {
					tsType: 'Date',
					apiPropertyType: 'String',
					apiFormat: 'date-time',
					validators: ['IsDate()', 'Type(() => Date)'],
				};
				break;
			case 'Json':
				hint = { tsType: 'unknown', validators: [] };
				break;
			case 'Bytes':
				hint = { tsType: 'Uint8Array', validators: [] };
				break;
			default:
				hint = { tsType: 'unknown', validators: [] };
		}
	}

	if(isList) {
		const elementValidators = hint.validators.filter((v) => !v.startsWith('Type('));
		return {
			tsType: `${hint.tsType}[]`,
			apiPropertyType: hint.apiPropertyType
				? (hint.apiPropertyType.startsWith('[') ? hint.apiPropertyType : `[${hint.apiPropertyType}]`)
				: undefined,
			apiFormat: hint.apiFormat,
			validators: ['IsArray()', ...elementValidators],
		};
	}

	return hint;
}

/** Prefer UUID validator when the field looks like an id String (common Nest/Prisma pattern). */
export function refineIdValidators(
	fieldName: string,
	isId: boolean,
	prismaType: string,
	validators: string[],
): string[] {
	if(prismaType !== 'String') {
		return validators;
	}
	if(!validators.includes('IsString()')) {
		return validators;
	}
	if(isId || fieldName === 'id' || fieldName.toLowerCase().endsWith('id')) {
		return validators.map((v) => (v === 'IsString()' ? 'IsUUID()' : v));
	}
	return validators;
}
