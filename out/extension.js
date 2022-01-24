"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path_1 = require("path");
const workspaces_1 = require("./workspaces");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    let config = vscode.workspace.getConfiguration('lnf');
    let configListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('lnf')) {
            config = vscode.workspace.getConfiguration('lnf');
        }
    });
    // Push the configuration listener.
    context.subscriptions.push(configListener);
    // 
    let lazyNewFile = vscode.commands.registerCommand('lazy-new-file.lazyNewFile', async (path) => {
        // Create the workspace edit.
        const wse = new vscode.WorkspaceEdit();
        const currentFileDir = (0, path_1.dirname)((path && path.fsPath) ||
            vscode.window.activeTextEditor?.document.fileName ||
            '');
        const newFileName = await vscode.window.showInputBox({
            title: 'New File',
            placeHolder: 'Enter a new file name (or relative path / name)',
        });
        // If we have a new file name
        if (newFileName) {
            // Gets the workspace URI.
            // If the config value is true, then the currently open file in the editor
            // will always have it's path chosen, and the workspace selection will not appear
            const workspaceUri = await (0, workspaces_1.default)(currentFileDir, config.get('alwaysUseCurrentFile', false));
            // get the URI path for the new file based on the workspace
            const fileUri = vscode.Uri.joinPath(workspaceUri, newFileName);
            // Create the file in the editor.
            await wse.createFile(fileUri);
            // apply these changes
            await vscode.workspace.applyEdit(wse);
            // If the openAfterCreate is set, open the file
            if (config.get('openAfterCreate', true)) {
                await vscode.commands.executeCommand('vscode.open', fileUri);
            }
        }
    });
    context.subscriptions.push(lazyNewFile);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map