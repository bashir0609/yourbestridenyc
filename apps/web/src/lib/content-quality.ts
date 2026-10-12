function normalized(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function meaningfulSummary(summary: string, title: string): string | undefined {
  const cleanSummary = normalized(summary);
  const cleanTitle = normalized(title);
  if (!cleanSummary || cleanSummary === cleanTitle) return;
  const repeatedTitle = cleanTitle ? cleanSummary.split(cleanTitle).join('').trim() : cleanSummary;
  return repeatedTitle ? summary : undefined;
}
