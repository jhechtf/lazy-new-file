import { dirname } from 'node:path';
import {
	type QuickPickItem,
	type QuickPickOptions,
	Uri,
	WorkspaceEdit,
	commands,
	window,
	workspace,
	type TextDocumentShowOptions,
	ViewColumn,
} from 'vscode';
import { config } from '../config';
import getWorkspaceUri from '../workspaces';
import { expandPathString } from '../util';

function showQuickPickWithUserInput(
	items: QuickPickItem[],
	options: QuickPickOptions = {},
) {
	return new Promise<QuickPickItem | null>((resolve) => {
		const quickPick = window.createQuickPick();
		Object.assign(quickPick, options);
		quickPick.items = items;
		quickPick.onDidHide(() => {
			quickPick.items = items;
		});
		quickPick.onDidChangeValue(() => {
			// We need to add the thingies to this
			if (
				quickPick.value !== '' &&
				!items.find((f) => f.label === quickPick.value)
			) {
				quickPick.items = items.concat({ label: quickPick.value });
			}
		});
		quickPick.onDidAccept(() => {
			const selection = quickPick.activeItems[0];
			/**
			 * LOGIC: If the selection is not found, then the user has typed in something
			 * outside of the passed-down options. Otherwise, they have hit enter on a
			 * quick pick item so we add its value to the input.
			 */
			if (items.find((f) => f.label === selection.label) === undefined) {
				resolve(selection);
				quickPick.hide();
				quickPick.items = items;
			} else {
				quickPick.value = selection.label;
			}
		});
		quickPick.show();
	});
}

export default commands.registerCommand(
	'lazy-new-file.lazyNewFile',
	async function lazyNewFile() {
		// Create the workspace edit, used when making a file later
		const wse = new WorkspaceEdit();
		// The current file directory
		const currentFileDir = dirname(
			window.activeTextEditor?.document.fileName || '',
		);

		const configMap = config.get<Record<string, string>>('aliases') || {};
		const ladderOpen = config.get('lnf.ladderOpen', true);

		const workspaceRootUri = workspace.getWorkspaceFolder(
			await getWorkspaceUri(
				currentFileDir,
				config.get('alwaysUseCurrentFile', false),
			),
		);
		if (!workspaceRootUri) {
			return window.showErrorMessage(
				'Could not determine workspace root folder',
			);
		}

		const configMapQuickPicks: QuickPickItem[] = Array.from(
			Object.entries(configMap),
		).map(([label, detail]) => {
			return {
				label,
				detail,
			};
		});

		// grab the new file path
		const newFileName = await showQuickPickWithUserInput(configMapQuickPicks, {
			title: 'Enter the location of the new file',
		});

		const createdFiles: Uri[] = [];

		// The answer can be empty, in which case no action is taken.
		// But if we are given a value, we work to create the new file
		if (newFileName !== null) {
			const configMap = config.get<Record<string, string>>('aliases') || {};

			// This should always be SOMETHING
			let workspaceUri = await getWorkspaceUri(
				currentFileDir,
				config.get('alwaysUseCurrentFile', false),
			);

			const files = expandPathString(newFileName.label);

			// Meaning this should basically always give us a root folder
			const workspaceRoot = workspace.getWorkspaceFolder(
				workspaceRootUri.uri,
			)?.uri;

			if (workspaceRoot === undefined) {
				window.showErrorMessage('Could not determine workspace path');
				return;
			}
			// Iterate over the config map to see if there are any aliases present in the string
			for (let filePathRaw of files) {
				// We're going to need the file uri for a bit
				let fileUri: Uri | undefined = undefined;

				// iterate over the config map
				for (const [key, value] of Object.entries(configMap)) {
					// if the filepath includes the current key, replace that shit
					if (filePathRaw.includes(key)) {
						const replValue = value.replace('${workspaceRoot}', './');
						filePathRaw = filePathRaw.replace(key, './');
						workspaceUri = Uri.joinPath(workspaceRoot, replValue);
						fileUri = Uri.joinPath(workspaceUri, filePathRaw);
						createdFiles.push(fileUri);
						wse.createFile(fileUri);
						break;
					}
				}

				// No match was found, so we just assume it's meant to be based off the current file
				if (fileUri === undefined) {
					fileUri = Uri.joinPath(workspaceUri, filePathRaw);
					createdFiles.push(fileUri);
				}
				wse.createFile(fileUri);
			}

			let side = 0;
			await workspace.applyEdit(wse);

			if (config.get('openAfterCreate', true)) {
				for (const fileUri of createdFiles) {
					await commands.executeCommand('vscode.openWith', fileUri, 'default', {
						viewColumn: side === 0 ? ViewColumn.One : ViewColumn.Two,
					} as TextDocumentShowOptions);
					if (ladderOpen) side = 1 - side;
				}
			}
		}
	},
);
