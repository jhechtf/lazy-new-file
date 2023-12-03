import { Uri, WorkspaceEdit, commands, window, workspace } from "vscode";
import { dirname } from "path";
import getWorkspaceUri from "../workspaces";
import { config } from "../config";

export default commands.registerCommand('lazy-new-file.lazyNewFile', async function lazyNewFile() {
  const wse = new WorkspaceEdit();
  const currentFileDir = dirname(
    window.activeTextEditor?.document.fileName || ''
  );

  const newFileName = await window.showInputBox({
    title: 'New File',
    placeHolder: 'Entr a new file name (or relative path/name)'
  });
  
  if(newFileName) {
    const workspaceUri = await getWorkspaceUri(
      currentFileDir,
      config.get('alwaysUseCurrentFile', false)
    );

    const fileUri = Uri.joinPath(workspaceUri, newFileName);

    await wse.createFile(fileUri);

    await workspace.applyEdit(wse);

    if(config.get('openAfterCreate', true)) {
      await commands.executeCommand('vscode.open', fileUri);
    }
  }
});