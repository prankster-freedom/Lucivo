// 図の SVG を画像にして、広間の立体図の層にする（DD-MWLK-007、DTP-MWLK-050）。
// 画像の中の SVG は別の文書になるため、元の図と id が重複せず、矢じりやグラデーションの参照が崩れない。

export interface FigureLayer { url: string; role: 'lines' | 'nodes' | 'all'; }
export interface FigureImages { layers: FigureLayer[]; width: number; height: number; }

const NS = 'http://www.w3.org/2000/svg';
// 層ごとに隠すもの。線の層は枠（サブグラフ）と線、ノードの層はノードと線のラベルを見せる
const HIDE = {
  lines: '.nodes, .edgeLabels',
  nodes: '.edgePaths, .clusters'
};

function sizeOf(svg: SVGSVGElement): { width: number; height: number } {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) return { width: vb.width, height: vb.height };
  const rect = svg.getBoundingClientRect();
  return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
}

function toUrl(svg: SVGSVGElement, size: { width: number; height: number }, hide: string | null): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  // 画像の大きさを、表示の大きさではなく図そのものの大きさにする
  copy.setAttribute('width', String(size.width));
  copy.setAttribute('height', String(size.height));
  copy.style.removeProperty('max-width');
  copy.style.removeProperty('width');
  copy.style.removeProperty('height');
  if (hide) {
    const style = document.createElementNS(NS, 'style');
    style.textContent = `${hide} { visibility: hidden !important; }`;
    copy.insertBefore(style, copy.firstChild);
  }
  const data = new XMLSerializer().serializeToString(copy);
  return URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
}

export function figureImages(svg: SVGSVGElement): FigureImages {
  const size = sizeOf(svg);
  const layered = !!svg.querySelector('.nodes') && !!svg.querySelector('.edgePaths');
  const layers: FigureLayer[] = layered
    ? [{ url: toUrl(svg, size, HIDE.lines), role: 'lines' }, { url: toUrl(svg, size, HIDE.nodes), role: 'nodes' }]
    : [{ url: toUrl(svg, size, null), role: 'all' }];
  return { layers, ...size };
}

export function revokeFigures(figures: FigureImages[]): void {
  figures.forEach(f => f.layers.forEach(l => URL.revokeObjectURL(l.url)));
}
