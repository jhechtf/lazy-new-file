import { workspace } from 'vscode';

// get the configuration for the workspace
export let config = workspace.getConfiguration('lnf');

// config change listener
export const configListener = workspace.onDidChangeConfiguration((e) => {
	// If the change affects the lnf namespace
	if (e.affectsConfiguration('lnf')) {
		// update the config
		config = workspace.getConfiguration('lnf');
	}
});
