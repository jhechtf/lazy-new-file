"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const path_1 = require("path");
/**
 *
 * @param def the default file path.
 * @param forceDefault force the user to use the value passed to the "def"
 * argument. Will not show a quick picker.
 * @returns the URI object that has been chosen.
 */
async function getWorkspaceUri(def, forceDefault = false) {
    if (def.includes('./')) {
        def = (0, path_1.resolve)(def);
    }
    let workspaceUri = vscode_1.Uri.file(def);
    // If the workspace defaults to the '.' after going through the dirname
    // function, and we only have one workspace folder...
    if (def === '.' &&
        vscode_1.workspace.workspaceFolders &&
        vscode_1.workspace.workspaceFolders.length === 1) {
        workspaceUri = vscode_1.workspace.workspaceFolders[0].uri;
        // Other wise...
    }
    else if (
    // If we aren't forcing default
    !forceDefault &&
        // And the workspace has folders
        vscode_1.workspace.workspaceFolders &&
        // and it has more than ONE folder...
        vscode_1.workspace.workspaceFolders.length > 1) {
        // Create some quick pick items based on the folders...
        const items = vscode_1.workspace.workspaceFolders.map(wsf => ({
            label: wsf.name,
            description: wsf.uri.fsPath,
            name: wsf.name,
            uri: wsf.uri
        }));
        // Show the choosing window
        const chosen = await vscode_1.window.showQuickPick(items, {
            title: 'Choose a workspace to create the new file in',
            placeHolder: 'Or hit escape to default to the same directory that the current open file is located.'
        });
        // If we have a chosen, then we use it!
        if (chosen) {
            workspaceUri = chosen.uri;
        }
        else {
            // Otherwise we just default to whatever the first workspace is.
            workspaceUri = vscode_1.workspace.workspaceFolders[0].uri;
        }
    }
    // return it all.
    return workspaceUri;
}
exports.default = getWorkspaceUri;
//# sourceMappingURL=workspaces.js.map