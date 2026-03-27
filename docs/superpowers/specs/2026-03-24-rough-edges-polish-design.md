# Lazy New File — Rough Edges Polish (Option B)

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Four targeted bug/UX fixes, each landing in its own commit to support stacked PR diffs.

---

## Overview

Four independent fixes to address silent bugs and user-facing friction in the Lazy New File VSCode extension. No new features. No changes to the public API or configuration schema.

---

## Fix 1 — Correct `ladderOpen` config key

**File:** `src/commands/lazy-new-file.ts:32`

**Problem:** `config.get('lnf.ladderOpen', true)` is called on a config object already scoped to the `lnf` namespace. The key `'lnf.ladderOpen'` is never found, so the setting always falls back to `true` regardless of user configuration.

**Fix:** Change the key to `'ladderOpen'` to match the scoped namespace, consistent with the other `config.get` calls in the same file (e.g. `'alwaysUseCurrentFile'`).

**Change:** One-line edit in `src/commands/lazy-new-file.ts`.

**Commit message:** `fix: correct ladderOpen config key lookup`

---

## Fix 2 — Workspace picker escape uses current file directory

**File:** `src/workspaces.ts:64`

**Problem:** In a multi-root workspace, when the user escapes the workspace picker, the code silently falls back to `workspaceFolders[0]` — the first workspace — rather than the current file's directory. This can create files in an unexpected location.

**Fix:** On escape (i.e. `chosen` is undefined), return `Uri.file(def)` — the resolved current-file directory that was passed in as `def`. This is already the correct default and is computed at the top of the function.

**Change:** One-line edit in `src/workspaces.ts` replacing `workspace.workspaceFolders[0].uri` with `Uri.file(def)` in the escape branch.

**Commit message:** `fix: workspace picker escape falls back to current file directory`

---

## Fix 3 — Show explorer context menu on folders

**File:** `package.json` (`contributes.menus.explorer/context`)

**Problem:** The `when` clause includes `!explorerResourceIsFolder`, which prevents the command from appearing when right-clicking a folder. Creating a file inside a folder via its context menu is a natural workflow.

**Fix:** Remove `!explorerResourceIsFolder` from the `when` clause. The command already handles the case where no file is open: `window.activeTextEditor` is `undefined`, so `currentFileDir` becomes `dirname('')` = `'.'`, and `workspaces.ts:29` already handles `def === '.'` by using the workspace root.

**Change:** Edit the `when` clause in `package.json` from:
```
"config.lnf.showExplorerItem && !explorerResourceIsFolder"
```
to:
```
"config.lnf.showExplorerItem"
```

No changes to command logic required.

**Commit message:** `fix: show explorer context menu item on folders`

---

## Fix 4 — QuickPick alias selection requires only one Enter

**File:** `src/util.ts` (`showQuickPickWithUserInput`)

**Problem:** When a user selects a predefined alias from the QuickPick list, the current `onDidAccept` handler detects that the item is in the original list and stuffs its label back into the input field, requiring a second Enter to confirm. This is confusing — one Enter should be enough.

**Fix:** In `onDidAccept`, when the selected item is found in the original `items` list, resolve immediately with that item (same as the non-alias path). The downstream consumer (`lazy-new-file.ts`) reads `selection.label` regardless, so the resolved value is correct either way.

**Change:** Edit the `onDidAccept` handler in `src/util.ts`. Replace the `if/else` that branches on list membership so both branches resolve immediately. Remove the `quickPick.value = selection.label` assignment.

**Commit message:** `fix: resolve alias selection on first Enter`

---

## Commit Order

Each fix is independent. Suggested order matches logical complexity (simplest first):

1. `fix: correct ladderOpen config key lookup`
2. `fix: workspace picker escape falls back to current file directory`
3. `fix: show explorer context menu item on folders`
4. `fix: resolve alias selection on first Enter`

---

## Testing Notes

- Fix 1: Toggle `lnf.ladderOpen` to `false` and create multiple files — they should all open in column 1.
- Fix 2: Open a multi-root workspace, invoke the command, escape the workspace picker — file should be created relative to the current file's directory.
- Fix 3: Right-click a folder in the explorer — the "Lazy New File" item should appear.
- Fix 4: Invoke the command, select a predefined alias from the list with one Enter — the file should be created without requiring a second Enter.
