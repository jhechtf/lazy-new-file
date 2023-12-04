# Lazy New File README

Lazy new file allows you to quickly create a new file based on the path of the currently open file in your editor.

## Contributes

Contributes the following:

1. `lazy-lazy-new-file.lazyNewFile` command
2. Three configuration options:
    1. `lnf.alwaysUseCurrentFile` &ndash; by default we will always use the 
    filepath of the currently open file to determine where the new file will be 
    created, but just in case you use this in a multiple workspace environment, 
    you a selector will appear to determine which workspace to use. 
    _**NOTE**_: This will _ALWAYS_ default to the **root** of that workspace.
    2. `lnf.openAfterCreate` &ndash; Open the new file after creating it.
    3. `lnf.showExplorerItem` &ndash; show the "Lazy New File" item in the explorer context.
    4. `lnf.aliases` &ndash; Aliases for the current workspace.
3. Adds a "Lazy New File" to the context menu on the explorer files. Does not 
show up for folders as the behavior is mimicked by VSCode already.

## Keybindings

By default there are no added keybindings. I would recommend something 
like `ctrl+alt+n` on Windows. 

## Aliases

Aliases should be unique among themselves and ***not*** nested. Both the shortcut and the expanded value should end with slashes

### ✅ Examples of good aliases

```json
"lnf.aliases": {
  "$src/": "${workspaceRoot}/src/",
  "$lib/": "${workspaceRoot}/lib/"
}
```

### ❌ Examples of bad aliases

```json
"lnf.aliases": {
  "$src/": "${workspaceRoot}/src",
  // This item will never be matched because the extensions exists on first match
  "$src/lib": "${workspaceRoot}/src/lib"
}