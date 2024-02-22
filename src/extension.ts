import * as vscode from 'vscode';
import lazyNewFile from './commands/lazy-new-file';
import { configListener } from './config';

export function activate(context: vscode.ExtensionContext) {
  // Push the configuration listener.
  context.subscriptions.push(configListener);
  // register the lazyNewFile command
  context.subscriptions.push(lazyNewFile);
}

// this method is called when your extension is deactivated
export function deactivate() {}
