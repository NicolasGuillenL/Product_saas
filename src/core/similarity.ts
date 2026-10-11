const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'pra', 'com', 'sem', 'a', 'o', 'as', 'os',
  'um', 'uma', 'no', 'na', 'nos', 'nas', 'por', 'kit',
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Stemming bem simples para plural em português ("mesas" -> "mesa", "pães" -> "pae"). */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith('oes')) return token.slice(0, -3) + 'ao';
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem);
}

/** Termo da busca bate com palavra do título igual ou que começa com ele ("inox" -> "inoxidavel"). */
function matches(queryToken: string, titleTokens: string[]): boolean {
  return titleTokens.some((t) => t === queryToken || (queryToken.length >= 3 && t.startsWith(queryToken)));
}

/** Fração (0..1) dos termos da busca presentes no título do produto. */
export function relevance(query: string, title: string): number {
  const q = [...new Set(tokens(query))];
  if (q.length === 0) return 0;
  const t = tokens(title);
  return q.filter((tok) => matches(tok, t)).length / q.length;
}
