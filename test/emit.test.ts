import assert from 'assert';
import { emitModelClass, emitSchema } from '../src/emit';
import { resolveConfig, type ModelInfo } from '../src/types';

const project: ModelInfo = {
	name: 'Project',
	fields: [
		{
			name: 'id',
			kind: 'scalar',
			type: 'String',
			isRequired: true,
			isList: false,
			isId: true,
			hasDefault: true,
			isUpdatedAt: false,
		},
		{
			name: 'title',
			kind: 'scalar',
			type: 'String',
			isRequired: true,
			isList: false,
			isId: false,
			hasDefault: false,
			isUpdatedAt: false,
		},
		{
			name: 'description',
			kind: 'scalar',
			type: 'String',
			isRequired: false,
			isList: false,
			isId: false,
			hasDefault: false,
			isUpdatedAt: false,
		},
		{
			name: 'featured',
			kind: 'scalar',
			type: 'Boolean',
			isRequired: true,
			isList: false,
			isId: false,
			hasDefault: true,
			isUpdatedAt: false,
		},
		{
			name: 'tags',
			kind: 'scalar',
			type: 'String',
			isRequired: true,
			isList: true,
			isId: false,
			hasDefault: true,
			isUpdatedAt: false,
		},
		{
			name: 'owner',
			kind: 'object',
			type: 'User',
			isRequired: false,
			isList: false,
			isId: false,
			hasDefault: false,
			isUpdatedAt: false,
		},
	],
};

const config = resolveConfig({ outputDir: '/tmp/unused' });
const source = emitModelClass(project, config, new Set());

assert.match(source, /export class ProjectModelBase/);
assert.match(source, /@ApiProperty/);
assert.match(source, /@IsUUID\(\)/);
assert.match(source, /id!: string;/);
assert.match(source, /@ApiPropertyOptional/);
assert.match(source, /description\?: string \| null;/);
assert.match(source, /@IsBoolean\(\)/);
assert.match(source, /tags!: string\[\];/);
assert.doesNotMatch(source, /\bowner\b/);

const withRelations = emitModelClass(
	project,
	resolveConfig({ outputDir: '/tmp/unused', includeRelations: true }),
	new Set(),
);
assert.match(withRelations, /owner\?: User;/);

const files = emitSchema(
	{
		models: [project],
		enums: [{ name: 'Role', values: ['ADMIN', 'MEMBER'] }],
	},
	config,
);
assert.ok(files.some((f) => f.relativePath === 'enums/Role.ts'));
assert.ok(files.some((f) => f.relativePath === 'models/ProjectModelBase.ts'));
assert.ok(files.some((f) => f.relativePath === 'index.ts'));

process.stdout.write('emit.test.ts: ok\n');
