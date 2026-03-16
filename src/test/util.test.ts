import {
	expandPathString,
	expandWorkspaceString,
	regexifyPattern,
} from '../util';
import { findMatchingWorkspacePaths } from '../ws-utils';

import assert, { deepStrictEqual } from 'node:assert';

suite('expandPathString', () => {
	test('returns the same path when there are no commas or braces', () => {
		deepStrictEqual(expandPathString('path/file.ts'), ['path/file.ts']);
	});

	test('splits comma-separated paths when there are no braces', () => {
		deepStrictEqual(expandPathString('a.ts,b.ts'), ['a.ts', 'b.ts']);
		deepStrictEqual(expandPathString('a.ts, b.ts'), ['a.ts', 'b.ts']);
	});

	test('expands simple brace expressions', () => {
		deepStrictEqual(expandPathString('path/{a.ts,b.ts}'), [
			'path/a.ts',
			'path/b.ts',
		]);
	});

	test('expands brace expressions with subdirectories', () => {
		deepStrictEqual(expandPathString('path/{a.ts,subdir/b.ts}'), [
			'path/a.ts',
			'path/subdir/b.ts',
		]);
	});

	test('handles spaces around commas inside braces', () => {
		deepStrictEqual(expandPathString('path/{a.ts, subdir/b.ts}'), [
			'path/a.ts',
			'path/subdir/b.ts',
		]);
	});
});

suite('expandWorkspaceString', () => {
	const config = {
		'workspace-a': 'packages/workspace-a',
		'workspace-b': 'packages/workspace-b',
	};

	test('works without asterisks', () => {
		deepStrictEqual(
			expandWorkspaceString('packages/workspace-a/bob.ts', config),
			['packages/workspace-a/bob.ts'],
		);
	});

	test('expands asterisk patterns', () => {
		deepStrictEqual(
			expandWorkspaceString('$bob/src', {
				...config,
				'$*/src': 'packages/$1/src/',
			}),
			['packages/bob/src/'],
		);
	});
});

suite('findMatchingWorkspacePaths', () => {
	test('finds available paths', async () => {
		const config = {
			'$*/src/': '${workspaceRoot}/packages/$1/src/',
			'$*/': '${workspaceRoot}/packages/$1/',
		};

		const matchingWorkspacePaths = await findMatchingWorkspacePaths(config);
		const sort = (arr: typeof matchingWorkspacePaths) =>
			[...arr].sort((a, b) => `${a.key}${a.matchedKey}`.localeCompare(`${b.key}${b.matchedKey}`));

		deepStrictEqual(sort(matchingWorkspacePaths), sort([
			{
				key: '$*/src/',
				matchedKey: '$package-1/src/',
				path: '${workspaceRoot}/packages/$1/src/',
				matchedPath: '${workspaceRoot}/packages/package-1/src/',
			},
			{
				key: '$*/src/',
				matchedKey: '$package-2/src/',
				path: '${workspaceRoot}/packages/$1/src/',
				matchedPath: '${workspaceRoot}/packages/package-2/src/',
			},
			{
				key: '$*/',
				matchedKey: '$package-1/',
				path: '${workspaceRoot}/packages/$1/',
				matchedPath: '${workspaceRoot}/packages/package-1/',
			},
			{
				key: '$*/',
				matchedKey: '$package-2/',
				path: '${workspaceRoot}/packages/$1/',
				matchedPath: '${workspaceRoot}/packages/package-2/',
			},
		]));
	});
});

suite('regexifyPattern', () => {
	test('Works with single value finds', () => {
		const pattern = 'packages/$1/src/';
		const reg = regexifyPattern(pattern);

		assert.strictEqual(reg.test('packages/package-1/src/'), true);
	});

	test('Works with multiple value finds', () => {
		const pattern = 'packages/$1/src/$2/';
		const reg = regexifyPattern(pattern);

		assert.strictEqual(reg.test('packages/package-2/src/other/'), true);
	});
});
