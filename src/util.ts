import type { ConfigMap } from "./types";
import { type QuickPickItem, type QuickPickOptions, window } from 'vscode';

/**
 *
 * @param path
 * @returns an extracted list of file paths to create
 * @example 'path/{a.ts,b.ts}' -> ['path/a.ts','path/b.ts']
 * @example 'path/{a.ts,subdir/b.ts}' -> ['path/a.ts', 'path/subdir/b.ts']
 */
export function expandPathString(path: string): string[] {
  const paths: string[] = [];
  // No commas or {} means nothing to expand.
  if (!path.includes(',') && !path.includes('{')) return [path];
  // We're going to do this the quick and dirty way for now

  // If we don't have any brackets, then we just have commas,
  // which means we can just return the paths from that
  if (!path.includes('{') && !path.includes('*')) {
    return path.split(/\s?,\s?/);
  }

  // Okay, so now things get fucky

  let base = '';
  let match = '';
  let matching = false;

  for (let i = 0; i < path.length; i++) {
    if (matching && path[i] !== '}') {
      match += path[i];
    } else if (!matching && path[i] !== '{' && path[i] !== '}') base += path[i];
    else if (path[i] === '{') {
      matching = true;
    } else if (path[i] === '}') {
      matching = false;
    }
  }

  if (match.length) {
    for (const p of match.split(/\s?,\s?/)) {
      paths.push(`${base}${p}`);
    }
  }

  return paths;
}

/**
 * 
 * @param str a user-input string
 * @param config Config mapp, grabbed through workspace config
 * @returns 
 */
export function expandWorkspaceString(
  str: string,
  config: ConfigMap,
): string[] {
  const built: string[] = [];

  const [key, keyMatcher] = getBestMatch(str, config);

  // If we found no matches, then we don't need this expanded
  if (!key || !keyMatcher) return [str];
  console.info('key', key);
  // Turn the key into a regex
  const repl = config[key];

  const matches = str.match(keyMatcher);

  // If no matches, return the original string
  if (!matches) {
    return [str];
  }

  // Full match is at index 0, partial is at index 1
  const [fullMatch, partial] = matches;

  // Get the rest of the string after the full match
  const restOfMatch = str.slice(
    str.indexOf(fullMatch) + fullMatch.length
  );
  console.info(repl);
  // get the new base string
  const base = repl.replace('$1', partial);
  // push to the array
  built.push(`${base}${restOfMatch}`);

  return built;
}

export function getBestMatch(
  str: string,
  config: ConfigMap,
): [null, null] | [string, RegExp] {
  let match: string | null = null;
  let regexified: RegExp | null = null;
  for (const key of Object.keys(config)) {
    regexified = regexifyKey(key);
    if (regexified.test(str)) {
      if (!match) {
        match = key;
        return [match, regexified]
      }
    }
  }
  return [null, null];
}

/**
 * 
 * @param str a key pattern for matching generics
 * @returns a regexp object turning the key into proper regex syntax
 */
export function regexifyKey(str: string): RegExp {
  return new RegExp(str.replace(/\*/g, '(.*?)').replace('$', '\\$'));
}

/**
 * 
 * @param str a string representing a matching pattern
 * @returns a regex that replaces strings like '$1' into `(.*?)` for pattern matching
 */
export function regexifyPattern(str: string): RegExp {
  return new RegExp(str.replace(/\$\d+/g, '(.*?)'));
}

export function filterThenMap<T, R>(arr: T[], fn: (cur: T, i: number, a: typeof arr) => [boolean, () => R]): R[] {
  const results: R[] = [];
  for (let i = 0; i < arr.length; i++) {
    const [bool, value] = fn(arr[i], i, arr);
    if (bool) {
      results.push(value());
    }
  }
  return results;
}

export function showQuickPickWithUserInput(
  items: QuickPickItem[],
  options: QuickPickOptions = {
    // Temporary, should be deleted before merging.
    ignoreFocusOut: true,
  }
) {
  return new Promise<QuickPickItem | null>(resolve => {
    const quickPick = window.createQuickPick();
    Object.assign(quickPick, options);
    quickPick.items = items;

    // reset items on hide
    quickPick.onDidHide(() => {
      quickPick.items = items;
    });

    // Update items as the user types
    quickPick.onDidChangeValue(() => {
      const filteredItems1 = filterThenMap(items, cur => {
        const keyRegex = regexifyKey(cur.label);
        const matches = quickPick.value.match(keyRegex);
        return [
          matches !== null,
          () => {
            let bob = cur.detail;
            if (matches === null) {
              cur.alwaysShow;
              return cur;
            }
            matches?.slice(1).forEach((v, i) => {
              bob = bob?.replace(`$${i + 1}`, v);
            });
            return {
              label: quickPick.value,
              description: cur.detail,
              detail: bob,
            } as QuickPickItem;
          },
        ];
      });

      if (filteredItems1.length > 0) {
        quickPick.items = quickPick.items.concat(filteredItems1);
        console.info(filteredItems1);
      }

      if (
        quickPick.value !== '' &&
        !items.find(f => f.label === quickPick.value)
      ) {
        quickPick.items = items.concat({ label: quickPick.value });
      }
    });

    // Handle accept event
    quickPick.onDidAccept(() => {
      const selection = quickPick.activeItems[0];
      /**
       * LOGIC: If the selection is not found, then the user has typed in something
       * outside of the passed-down options. Otherwise, they have hit enter on a
       * quick pick item so we add its value to the input.
       */
      if (items.find(f => f.label === selection.label) === undefined) {
        resolve(selection);
        quickPick.hide();
        quickPick.items = items;
      } else {
        quickPick.value = selection.label;
      }
    });
    // Show the quick pick
    quickPick.show();
  });
}