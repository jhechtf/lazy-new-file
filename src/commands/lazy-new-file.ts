import { dirname } from 'node:path';
import {
  type QuickPickItem,
  type TextDocumentShowOptions,
  Uri,
  ViewColumn,
  WorkspaceEdit,
  commands,
  window,
  workspace
} from 'vscode';
import { config } from '../config';
import { expandPathString, regexifyKey, showQuickPickWithUserInput } from '../util';
import getWorkspaceUri from '../workspaces';
import { findMatchingWorkspacePaths } from '../ws-utils';

export default commands.registerCommand(
  'lazy-new-file.lazyNewFile',
  async function lazyNewFile() {
    // Create the workspace edit, used when making a file later
    const wse = new WorkspaceEdit();
    // The current file directory
    const currentFileDir = dirname(
      window.activeTextEditor?.document.fileName || ''
    );

    const configMap = config.get<Record<string, string>>('aliases') || {};
    const ladderOpen = config.get('lnf.ladderOpen', true);

    const workspaceRootUri = workspace.getWorkspaceFolder(
      await getWorkspaceUri(
        currentFileDir,
        config.get('alwaysUseCurrentFile', false)
      )
    );

    if (!workspaceRootUri) {
      return window.showErrorMessage(
        'Could not determine workspace root folder'
      );
    }

    const configMapQuickPicks: QuickPickItem[] = Array.from(
      Object.entries(configMap)
    ).map(([label, detail]) => {
      return {
        label,
        detail,
        // If this is a generic map item, always show it
        alwaysShow: label.includes('*'),
      };
    });

    // gets all paths in all workspaces that match any of our 
    // generic filepaths
    const wsPaths = await findMatchingWorkspacePaths(configMap);

    // Combine the base quickpicks with the matching ones
    configMapQuickPicks.push(
      ...wsPaths.map(
        path =>
        ({
          label: path.matchedKey,
          description: path.key,
          detail: path.matchedPath,
        } as QuickPickItem)
      )
    );

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
        config.get('alwaysUseCurrentFile', false)
      );

      const files = expandPathString(newFileName.label);

      // Meaning this should basically always give us a root folder
      const workspaceRoot = workspace.getWorkspaceFolder(
        workspaceRootUri.uri
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

          if (key.includes('*')) {
            // Build a RegExp from the key where '*' becomes a capturing group
            const keyRegex = regexifyKey(key);

            // Test the raw input path against our key pattern
            const matches = filePathRaw.match(keyRegex);
            if (!matches) continue; // no match, go to next config entry

            // matches[0] is the full matched portion, subsequent indices are capture groups
            const fullMatch = matches[0];
            const groups = matches.slice(1);

            // Start with the alias value and substitute $1, $2, ... with captured values
            let resolvedValue = value;
            groups.forEach((g, idx) => {
              const token = `$${idx + 1}`;
              // Replace all occurrences of the token with the captured group
              resolvedValue = resolvedValue.split(token).join(g || '');
            });

            // Remove any workspace placeholder; we'll join against the real workspace root
            // later when forming the final URI.
            const resolvedValueNoRoot = resolvedValue
              .replace('${workspaceRoot}/', '')
              .replace('${workspaceRoot}', '');

            // Determine the portion of the raw path that came after the matched segment
            const remainder = filePathRaw.slice(fullMatch.length);

            // Normalize joining so we don't duplicate slashes when concatenating
            let candidateRel = resolvedValueNoRoot;
            if (remainder) {
              if (candidateRel.endsWith('/') && remainder.startsWith('/'))
                candidateRel = candidateRel.slice(0, -1);
              candidateRel = `${candidateRel}${remainder}`;
            }

            // Construct the final file URI relative to the determined workspace root
            const finalFileUri = Uri.joinPath(workspaceRoot, candidateRel);
            createdFiles.push(finalFileUri);
            wse.createFile(finalFileUri);
            fileUri = finalFileUri;
            // We found a match and handled it — stop checking further aliases for this path
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
  }
);
