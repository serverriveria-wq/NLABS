/** Renderizador markdown ligero (sin dependencias). */
function inline(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-secondary px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="text-primary underline">$1</a>',
    );
}

export function Markdown({ source, className = "" }: { source?: string | null; className?: string }) {
  if (!source) return null;
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (list.length) {
      html.push(`<ul class="my-2 list-disc space-y-1 pl-5">${list.join("")}</ul>`);
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { list.push(`<li>${inline(li[1])}</li>`); continue; }
    flush();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const size = ["text-2xl", "text-xl", "text-lg", "text-base"][h[1].length - 1];
      html.push(`<h${h[1].length} class="mt-5 mb-2 font-bold tracking-tight ${size}">${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { html.push('<hr class="my-4 border-border" />'); continue; }
    if (!line.trim()) continue;
    html.push(`<p class="my-2 leading-relaxed">${inline(line)}</p>`);
  }
  flush();

  return (
    <div
      className={`text-sm text-foreground/90 ${className}`}
      dangerouslySetInnerHTML={{ __html: html.join("") }}
    />
  );
}
