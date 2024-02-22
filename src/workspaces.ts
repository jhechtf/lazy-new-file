import { resolve } from 'path';
import { QuickPickItem, Uri, window, workspace } from 'vscode';

interface CustomQuickPickItem extends QuickPickItem {
	name: string;
	uri: Uri;
}
/**
 *
 * @param def the default file path.
 * @param forceDefault force the user to use the value passed to the "def"
 * argument. Will not show a quick picker.
 * @returns the URI object that has been chosen.
 */
export default async function getWorkspaceUri(
	def: string,
	forceDefault = false,
): Promise<Uri> {
	// If the default file path includes ./ then we need to resolve it to a full file path
	if (def.includes('./')) {
		// biome-ignore lint/style/noParameterAssign: JS strings are not passed by reference, so fuck this
		def = resolve(def);
	}
	// Create the original workspaceUri
	let workspaceUri: Uri = Uri.file(def);
	// If the workspace defaults to the '.' after going through the dirname
	// function, and we only have one workspace folder...
	if (
		def === '.' &&
		workspace.workspaceFolders &&
		workspace.workspaceFolders.length === 1
	) {
		workspaceUri = workspace.workspaceFolders[0].uri;
		// Other wise...
	} else if (
		// If we aren't forcing default
		!forceDefault &&
		// And the workspace has folders
		workspace.workspaceFolders &&
		// and it has more than ONE folder...
		workspace.workspaceFolders.length > 1
	) {
		// Create some quick pick items based on the folders...
		const items: CustomQuickPickItem[] = workspace.workspaceFolders.map(
			(wsf) => ({
				label: wsf.name,
				description: wsf.uri.fsPath,
				name: wsf.name,
				uri: wsf.uri,
			}),
		);

		// Show the choosing window
		const chosen = await window.showQuickPick(items, {
			title: 'Choose a workspace to create the new file in',
			placeHolder:
				'Or hit escape to default to the same directory that the current open file is located.',
		});

		// If we have a chosen, then we use it!
		if (chosen) {
			workspaceUri = chosen.uri;
		} else {
			// Otherwise we just default to whatever the first workspace is.
			workspaceUri = workspace.workspaceFolders[0].uri;
		}
	}
	// return it all.
	return workspaceUri;
}
