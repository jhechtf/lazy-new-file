# Lazy New File README

Lazy new file allows you to quickly create a new file based on the path of the currently open file in your editor.

Create one or multiple files in any project, quickly and easily.

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
    5. `lnf.ladderOpen` &ndash; When creating multiple files, alternate between opening them on the left and right panes.
3. Adds a "Lazy New File" to the context menu on the explorer files. Does not 
show up for folders as the behavior is mimicked by VSCode already.

## Keybindings

By default there are no added keybindings. I would recommend something 
like `ctrl+alt+n` on Windows

## Creating multiple files

Creating multiple files in one prompt requires you to use a comma in the input field. The comma can be top level, or can be nested within a set of curly brackets(`{}`); e.g.

```
$components/expandable/{expandable.svelte,expandable.stories.svelte}
```

Will create two files in the folder where `$components/` is aliases: 

1. `$components/expandable/expandable.svelte`
2. `$components/expandable/expandable.stories.svelte`

These follow the same rules as the rest of the extension: if it matches an alias, it will be created from the given directory the alias is associated with.
Otherwise it will be based on the current file.

### Examples

```
# Assume we have `src/somefile.html` open

`a.ts,b.ts` -> `src/a.ts` + `src/b.ts`
`$routes/a/{+page.ts,+page.svelte}` -> `src/routes/a/+page.ts` + `src/routes/a/+page.svelte`
`$root/a.ts,b.ts` -> `/a.ts` + `src/b.ts`
`$utils/components/bob.svelte` -> `packages/utils/src/components/bob.svelte`
`lib/{something/index.ts,something-else.ts,something-else-else.ts}` -> `src/lib/something/index.ts` + `src/lib/something-else.ts` + `src/lib/something-else-else.ts`
```

**NOTE**: by default the aliases begin with `$`, this is to mimic bundlers to some degree, but there is no hard rule that your aliases must begin with the the `$` symbol.

## Aliases

Aliases should be unique among themselves and ***not*** nested. Both the shortcut and the expanded value should end with slashes.

### Wildcard Matches
Wildcard matches have been implemented recently, extending the syntax and unlocking setups for monorepos or specific nested file structures.

The key for a wildcard match should contain one or more asterisks (`*`), and the replacement matcher should use the dollar sign, followed by a corresponding match number, e.g.
`"@*/*/": "${workspaceRoot}/packages/$1/src/$2/`. These matches should still follow other rules for aliases.

### ✅ Examples of good aliases

```json
"lnf.aliases": {
  "$src/*/": "${workspaceRoot}/src/$1/",
  "$src/": "${workspaceRoot}/src/",
  "$lib/": "${workspaceRoot}/lib/"
}
```

### ❌ Examples of bad aliases

```json
"lnf.aliases": {
  "$src/": "${workspaceRoot}/src",
  // This item will never be matched because the extensions exists on first match
  "$src/*/": "${workspaceRoot}/src/$1/",
  "$src/lib/": "${workspaceRoot}/src/lib/"
}
```

## Workspaces

If you are working a repository that utilizes workspaces, where there are multiple
packages and apps, it can be useful to have it so that your aliases become aware of that. 

```json
"lnf.aliases": {
  "$src/*/": "${workspaceRoot}/packages/$1/src/??"
}
```