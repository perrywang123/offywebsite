/** Official tracking identifiers, independent of landing path and campaign parameters. */
export function officialBindingKeys(value: string): string[] {
  const url = new URL(value),
    ids = url.searchParams.getAll("dt_id");
  if (ids.length > 1 || ids.some((id) => !/^[A-Za-z0-9_-]{1,128}$/.test(id)))
    throw new Error("invalid_official_tracking");
  const code = /^\/discount\/([^/]+)$/.exec(decodeURIComponent(url.pathname))?.[1];
  return [
    ...(ids.length ? [`dt_id=${ids[0]}`] : []),
    ...(code ? [`discount=${code.toUpperCase()}`] : []),
  ];
}

export function duplicateOfficialBindings(
  records: Array<{ id: string; alias: string; officialLink: string }>,
) {
  const bindings = new Map<string, string[]>();
  for (const record of records) {
    try {
      for (const key of officialBindingKeys(record.officialLink))
        bindings.set(key, [...(bindings.get(key) ?? []), record.alias]);
    } catch {
      // Older malformed links cannot break the read-only workspace.
    }
  }
  return [...bindings].filter(([, aliases]) => aliases.length > 1);
}
