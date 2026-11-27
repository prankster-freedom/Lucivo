/* ==========================================================================
   Structurizr コードブロックの info string 解析（純粋モジュール）
   document-model.ts / block-renderers.ts から共有し、ELK 等に依存しない。
   ========================================================================== */

export interface StructurizrInfoString {
  lang: 'structurizr' | 'structurizr-dsl';
  initialViewKey?: string;
}

/**
 * Markdown コードブロックの info string（例: "structurizr view=Containers"）を解析する。
 * 対象外言語の場合は null を返す。
 */
export function parseStructurizrInfoString(rawLang: string | undefined | null): StructurizrInfoString | null {
  const trimmed = String(rawLang || '').trim();
  if (!trimmed) return null;

  const firstSpace = trimmed.search(/\s/);
  const langToken = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toLowerCase();
  if (langToken !== 'structurizr' && langToken !== 'structurizr-dsl') {
    return null;
  }

  const rest = firstSpace === -1 ? '' : trimmed.slice(firstSpace).trim();
  let initialViewKey: string | undefined;
  if (rest) {
    const quoted = /(?:^|\s)view="([^"]+)"/i.exec(rest) || /(?:^|\s)view='([^']+)'/i.exec(rest);
    if (quoted && quoted[1].trim()) {
      initialViewKey = quoted[1].trim();
    } else {
      const bare = /(?:^|\s)view=([^\s"']+)/i.exec(rest);
      if (bare && bare[1].trim()) {
        initialViewKey = bare[1].trim();
      }
    }
  }

  return {
    lang: langToken,
    initialViewKey
  };
}
