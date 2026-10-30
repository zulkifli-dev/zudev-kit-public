function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPage(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${safeTitle}</title></head><body><main><h1>${safeTitle}</h1><p>${escapeHtml(body)}</p></main></body></html>`;
}
