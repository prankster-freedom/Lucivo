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

// WCAG 2.1 の相対輝度（0〜1）
export function relativeLuminance(hex: string): number {
  const v = parseInt(hex.replace('#', ''), 16);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear((v >> 16) & 255) + 0.7152 * toLinear((v >> 8) & 255) + 0.0722 * toLinear(v & 255);
}

// 2 色間のコントラスト比（1〜21）
export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// 背景色に対して高いコントラスト比を得られる文字色（濃色または白）を選ぶ（#258, #260）
export function pickContrastInk(bgHex: string, darkInk = '#0F172A', lightInk = '#FFFFFF'): string {
  return contrastRatio(bgHex, lightInk) >= contrastRatio(bgHex, darkInk) ? lightInk : darkInk;
}
