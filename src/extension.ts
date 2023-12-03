import * as vscode from 'vscode';
import lazyNewFile from "./commands/lazy-new-file";
import { configListener } from "./config";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Push the configuration listener.
  context.subscriptions.push(configListener);
  // register the lazyNewFile command 
	context.subscriptions.push(lazyNewFile);
}

// this method is called when your extension is deactivated
export function deactivate() {}
