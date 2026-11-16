// 2 つの色を混ぜる。ratio は b の割合（0 で a、1 で b）
export function mixHex(a: string, b: string, ratio: number): string {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - ratio) + ((pb >> shift) & 255) * ratio);
  return `#${[16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}
