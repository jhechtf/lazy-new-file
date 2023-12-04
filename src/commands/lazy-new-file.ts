import { Uri, WorkspaceEdit, commands, window, workspace } from "vscode";
import { dirname } from "path";
import getWorkspaceUri from "../workspaces";
import { config } from "../config";

export default commands.registerCommand('lazy-new-file.lazyNewFile', async function lazyNewFile() {
  // Create the workspace edit, used when making a file later
  const wse = new WorkspaceEdit();
  // The current file directory
  const currentFileDir = dirname(
    window.activeTextEditor?.document.fileName || ''
  );

  // grab the new file path
  let newFileName = await window.showInputBox({
    title: 'New File',
    placeHolder: 'Entr a new file name (or relative path/name)'
  });

  // The answer can be empty, in which case no action is taken.
  // But if we are given a value, we work to create the new file
  if(newFileName) {
    let configMap = config.get<Record<string, string>>('aliases') || {};

    // This should always be SOMETHING
    let workspaceUri = await getWorkspaceUri(
      currentFileDir,
      config.get('alwaysUseCurrentFile', false)
    );

    // Meaning this should basically always give us a root folder
    const workspaceRoot = workspace.getWorkspaceFolder(workspaceUri)?.uri;

    // Iterate over the config map to see if there are any aliases present in the string
    for(const [key, value] of Object.entries(configMap)) {
      // If the text given from the user includes the key
      if(newFileName.includes(key)) {
        // The aliases might have some form of "${workspaceRoot} in them"
        // Meaning we have to ensure we have the proper workspace root
        if(workspaceRoot) {
          // remove the replaceable value and replace it with "./"
          const replValue = value.replace('${workspaceRoot}', './');
          // modify the new file name to be relative to what will become the new root
          newFileName = newFileName.replace(key, './');
          // update the workspace Uri to be the new root + the "parsed" value
          workspaceUri = Uri.joinPath(workspaceRoot, replValue);

        } else {
          // Otherwise we error and nothing more happens
          window.showErrorMessage('Could not determine workspace root when using an alias\n'+key);
        }
        // We only parse one alias. If your aliases are setup in a way that multiple of them match
        // only the first one found will work.
        break;
      }
    }


    // Join the workspace URI + filename to get the file URI
    const fileUri = Uri.joinPath(workspaceUri, newFileName);

    // Create the file
    await wse.createFile(fileUri);

    await workspace.applyEdit(wse);

    // opens the file if the setting is there.
    if(config.get('openAfterCreate', true)) {
      await commands.executeCommand('vscode.open', fileUri);
    }
  }
});