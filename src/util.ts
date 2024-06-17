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
  if (!path.includes('{')) {
    return path.split(/\s?,\s?/);
  }
  
  // Okay, so now things get fucky

  let base = '';
  let match = '';
  let matching = false;
  for(let i = 0; i < path.length; i++) {
    if(matching && path[i] !== '}') {
      match += path[i];
    } else if(!matching && path[i] !== '{' && path[i] !== '}') base += path[i]
    else if (path[i] === '{') {
      matching = true;
    } else if (path[i] === '}') {
      matching = false;
    }
  }

  if(match.length) {
    for(const p of match.split(/\s?,\s?/)) {
      paths.push(`${base}${p}`);
    }
  }

  return paths;
}
