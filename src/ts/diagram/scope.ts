// SVG 内の id を SVG ごとに一意にし、url(#…)・href・aria 参照を書き換える。
// Mermaid はシーケンス図の矢じり（#arrowhead）などを図をまたいで同じ id で出力するため、
// 同じページに複数の図があると、別の図（非表示のものを含む）のマーカーやグラデーションを参照してしまう
export function scopeSvgIds(svg: SVGElement | HTMLElement): void {
  const prefix = svg.id || `lucivo-${Math.random().toString(36).slice(2, 9)}`;
  const idMap = new Map<string, string>();
  const used = new Set<string>();
  svg.querySelectorAll('[id]').forEach(el => {
    // Mermaid が 1 つの図の中で同じ id を出すこと（タイムラインの node-undefined など）があるため、
    // 2 つ目以降には連番を付ける。参照は最初の要素に向けたままにする。
    // Mermaid は図の id を接頭辞に付けた id も出すので、それには接頭辞を重ねない
    const base = el.id.startsWith(prefix) ? el.id : `${prefix}-${el.id}`;
    let scoped = base;
    for (let n = 2; used.has(scoped); n++) scoped = `${base}-${n}`;
    used.add(scoped);
    if (!idMap.has(el.id)) idMap.set(el.id, scoped);
    el.id = scoped;
  });
  if (idMap.size === 0) return;

  const ariaRefs = ['aria-labelledby', 'aria-describedby'];
  svg.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const value = attr.value;
      if (value.includes('url(')) {
        // style 属性は url("#id") のように引用符付きで書き出されるため、引用符の有無を問わない
        el.setAttribute(attr.name, value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (m, q, id) => (idMap.has(id) ? `url(#${idMap.get(id)})` : m)));
      } else if ((attr.name === 'href' || attr.name === 'xlink:href') && value.startsWith('#') && idMap.has(value.slice(1))) {
        el.setAttribute(attr.name, `#${idMap.get(value.slice(1))}`);
      } else if (ariaRefs.includes(attr.name)) {
        el.setAttribute(attr.name, value.split(/\s+/).map(id => idMap.get(id) || id).join(' '));
      }
    });
  });
}
