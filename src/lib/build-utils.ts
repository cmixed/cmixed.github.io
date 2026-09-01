export function parseFrontmatter<T extends Record<string, unknown>>(content: string): { meta: T; body: string } {
  content = content.replace(/\r\n/g, '\n');
  let match = content.match(/^---\n([\s\S]*?)\n\n?---\n([\s\S]*)$/);
  if (!match) match = content.match(/^[^\n]*\n+---\n([\s\S]*?)\n\n?---\n([\s\S]*)$/);
  if (!match) return { meta: {} as T, body: content };
  const yaml = match[1];
  const body = match[2];
  const meta = {} as Record<string, unknown>;
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val: string | string[] | boolean = line.slice(idx + 1).trim();
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (val.startsWith('[') && val.endsWith(']'))
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim());
    meta[key] = val;
  }
  return { meta: meta as T, body };
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
