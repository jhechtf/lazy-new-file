import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { Uri, workspace } from 'vscode';
import type { ConfigMap } from './types';
import { regexifyKey, regexifyPattern } from './util';

/**
 *
 * @param str a string path
 * @returns a normalized version of the string path, replacing Windows Style path parts
 * to match the unix style
 */
function normalize(str: string): string {
	// Replace Windows backslashes with POSIX forward slashes so later
	// pattern matching and comparisons behave the same on all OSes.
	return str.replace(/\\/g, '/');
}

/**
 *
 * @param config config map of aliases to root files
 * @returns an array of tuples, with the config key and the matching path
 * @example
 */
export async function findMatchingWorkspacePaths(config: ConfigMap) {
	type WorkspacePathMatch = {
		key: string;
		matchedKey: string;
		path: string;
		matchedPath: string;
	};
	// Array that will hold tuples of [configKey, matchedDirectory]
	// e.g. [ ["$src/", "packages/foo/src"], ... ]
	const workspaceItems: WorkspacePathMatch[] = [];

	// Filter configuration entries to those that include numeric capture
	// tokens like $1, $2, etc. These entries indicate patterns that
	// require searching the workspace for matching directories.
	const filePatterns = Object.entries(config).filter(([_, path]) =>
		/\$\d+/.test(path),
	);

	// Iterate over the key and its pattern
	for (const [key, pattern] of filePatterns) {
		for (const ws of workspace.workspaceFolders || []) {
			const dirs = await findDirectories(
				// We have to replace this to make the regex work better
				pattern.replace('${workspaceRoot}/', ''),
				// Use the native file path
				ws.uri.fsPath,
			);

			/**
			 * 1. convert pattern to regex.
			 * 2. extract matches from dir
			 * 3. going backwards, replace '*' characters with appropriate index match
			 */
			const regexPattern = regexifyPattern(
				pattern.replace('${workspaceRoot}/', ''),
			);

			const matchedPaths = dirs
				.map((dir) => {
					const matches = dir.match(regexPattern);
					let matchedKey = key;
					let matchedPattern = pattern;

					if (matches) {
						for (const match of matches.slice(1)) {
							matchedKey = matchedKey.replace('*', match);
							matchedPattern = matchedPattern.replace(/\$\d+/, match);
						}

						return {
							key,
							matchedKey,
							path: pattern,
							matchedPath: matchedPattern,
						} as WorkspacePathMatch;
					}
					return null;
				})
				.filter((e) => e !== null);

			workspaceItems.push(...matchedPaths);
		}
	}

	return workspaceItems;
}

export async function findDirectories(pattern: string, cwd: string) {
	// Will turn pattern into a thing, go from there

	// The results we return at the end.
	const results: string[] = [];
	// Turning the pattern into a regex
	const matcher = regexifyPattern(pattern);

	// Walk function declared here so that it has access to results and seen
	async function walk(root: string, dir: string) {
		let entries: Dirent[];

		try {
			// TODO: use the search.exclude ignore options.
			entries = await readdir(dir, { withFileTypes: true }).then((f) =>
				f.filter(
					(ff) =>
						!ff.name.startsWith('node_modules') &&
						!ff.name.startsWith('.git') &&
						!ff.name.startsWith('.vscode-test'),
				),
			);
		} catch {
			return;
		}

		// Get the relative directory of the root and the current directory
		const rel = relative(root, dir);
		// Normalize the relative values (mostly for Windows)
		const relToTest = `${normalize(rel === '' ? '.' : rel)}/`;

		// Check if our normalized relative dir matches our matcher
		if (matcher.test(relToTest)) {
			// Push this to our results
			results.push(relToTest);
		}

		// Grab any subdirectories.
		const subdirs = entries
			.filter((e) => e.isDirectory())
			// walk from our root to the current directory name
			.map((d) => walk(root, join(dir, d.name)));

		// if there are subdirs, await their resolving
		if (subdirs.length) await Promise.all(subdirs);
	}

	// Walk the base root
	await walk(cwd, cwd);

	// Return the results
	return results;
}
