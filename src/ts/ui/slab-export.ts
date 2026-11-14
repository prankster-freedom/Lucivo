// @ts-nocheck
import { downloadBlob } from '../utils/download';
import { showToast, updateStatus } from './toast';
import { state, EXPORT_URLS, loadLibrary, runtime } from './state';
import { getThemeSpec } from '../diagram/mermaid-config';
import { scrollBehavior } from '../app';

export function clearVisualStageSpotlight(container) {
  if (!container) return;
  container.querySelectorAll('.has-spotlight, .is-spotlight, .is-reached, .has-stage-focus, .is-stage-focused').forEach(el => {
    el.classList.remove('has-spotlight', 'is-spotlight', 'is-reached', 'has-stage-focus', 'is-stage-focused');
  });
}

// 章の画像化（FR-026）は、出力が誌面にならないため 0.2.0 では操作部を出さない（DD-VTPL-124、CR-001）。
// 画像化の処理（renderSlabToBlob など）は、CR-001 で作り直すまで残す
export const SLAB_IMAGE_EXPORT_ENABLED = false;

// スラブの操作バー（画像コピー・PNG保存、FR-026, DD-VTPL-120）
// ボタンの文字ラベルは CSS ::after で表示し、テキストノードを持たせないことでスラブ本文の内容一致（TC-VTPL-003）を保つ
export function buildSlabActionsHtml() {
  if (!SLAB_IMAGE_EXPORT_ENABLED) return '';
  return `
    <div class="slab-actions" aria-label="スラブの操作">
      <button type="button" class="slab-action-btn btn-copy-slab" title="この章のカード画像をクリップボードにコピー" aria-label="コピー"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
      <button type="button" class="slab-action-btn btn-export-slab" title="この章のカード画像をPNGとして保存" aria-label="PNG"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
    </div>
  `;
}

export function getSlabFilename(slabEl) {
  const stageNo = slabEl.dataset.stageNo || '00';
  const h2 = slabEl.querySelector('h2');
  let title = h2 ? h2.textContent.replace(/^STAGE\s*\d+\s*/i, '').trim() : 'slab';
  title = title.toLowerCase().replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF_-]+/g, '-').slice(0, 30);
  return `slab-${stageNo}-${title || 'card'}.png`;
}

export function renderSlabFallbackCanvas(
  width: number,
  height: number,
  bgColor: string,
  borderColor: string,
  textColor: string,
  vsC1: string,
  stageText: string,
  titleText: string,
  leadText: string,
  resolve: (blob: Blob) => void
) {
  try {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 16);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, width, height);
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 16);
      ctx.stroke();
    } else {
      ctx.strokeRect(0, 0, width, height);
    }

    let textX = 24;
    if (stageText) {
      ctx.fillStyle = vsC1.trim() || '#3B82F6';
      const badgeWidth = 72;
      const badgeHeight = 22;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(textX, 22, badgeWidth, badgeHeight, 11);
        ctx.fill();
      } else {
        ctx.fillRect(textX, 22, badgeWidth, badgeHeight);
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stageText, textX + badgeWidth / 2, 22 + badgeHeight / 2);
      textX += badgeWidth + 12;
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(titleText, textX, 33);

    if (leadText) {
      ctx.fillStyle = textColor;
      ctx.font = '14px "Noto Sans JP", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(leadText, 24, 60);
    }

    canvas.toBlob(blob => resolve(blob || new Blob([], { type: 'image/png' })), 'image/png');
  } catch (_) {
    resolve(new Blob([], { type: 'image/png' }));
  }
}

export function renderSlabToBlob(slabEl) {
  const rect = slabEl.getBoundingClientRect();
  const width = Math.max(360, Math.ceil(rect.width));
  const height = Math.max(200, Math.ceil(rect.height));

  const computed = window.getComputedStyle(slabEl);
  const bgColor = computed.backgroundColor || (state.appearance === 'dark' ? '#1E293B' : '#FFFFFF');
  const textColor = computed.color || (state.appearance === 'dark' ? '#F8FAFC' : '#0F172A');
  const borderColor = computed.borderColor || 'rgba(148, 163, 184, 0.2)';

  const wrapEl = slabEl.closest('.exhibition-wrap');
  const wrapComputed = wrapEl ? window.getComputedStyle(wrapEl) : computed;
  const vsC1 = wrapComputed.getPropertyValue('--vs-c1') || '#3B82F6';

  const h2 = slabEl.querySelector('h2');
  const stageBadge = slabEl.querySelector('.exhibition-num-badge');
  const stageText = stageBadge ? stageBadge.textContent.trim() : (slabEl.dataset.stageNo ? `STAGE ${slabEl.dataset.stageNo}` : '');
  const titleText = h2 ? h2.textContent.replace(/^STAGE\s*\d+\s*/i, '').replace(/コピー|PNG/g, '').trim() : 'Lucivo Card';

  const leadEl = slabEl.querySelector('.vs-lead, p, .vs-quote, li');
  const leadText = leadEl ? leadEl.textContent.trim().slice(0, 120) : '';

  return new Promise((resolve) => {
    const renderFallback = () =>
      renderSlabFallbackCanvas(width, height, bgColor, borderColor, textColor, vsC1, stageText, titleText, leadText, resolve);

    const timer = setTimeout(renderFallback, 250);

    try {
      const clone = slabEl.cloneNode(true);
      clone.querySelectorAll('.slab-actions, canvas.signal-light-canvas').forEach(el => el.remove());

      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <div style="font-family:'Plus Jakarta Sans',sans-serif;color:${textColor};background:${bgColor};padding:1.5rem;width:100%;height:100%;box-sizing:border-box;">
                ${clone.innerHTML}
              </div>
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        try {
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else renderFallback();
          }, 'image/png');
        } catch (e) {
          renderFallback();
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        renderFallback();
      };

      img.src = url;
    } catch (e) {
      clearTimeout(timer);
      renderFallback();
    }
  });
}

export async function copySlabImage(slabEl) {
  const filename = getSlabFilename(slabEl);
  try {
    const blob = await renderSlabToBlob(slabEl);
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('スラブ画像をクリップボードにコピーしました');
    } else {
      downloadBlob(blob, filename, 'image/png');
      showToast('クリップボード非対応のため画像を保存しました');
    }
  } catch (err) {
    console.warn('copySlabImage failed, fallback to download', err);
    try {
      const blob = await renderSlabToBlob(slabEl);
      downloadBlob(blob, filename, 'image/png');
      showToast('画像を保存しました');
    } catch (e) {
      showToast('画像のエクスポートに失敗しました');
    }
  }
}

export async function exportSlabImage(slabEl) {
  const filename = getSlabFilename(slabEl);
  try {
    const blob = await renderSlabToBlob(slabEl);
    downloadBlob(blob, filename, 'image/png');
    showToast('スラブ画像を保存しました');
  } catch (err) {
    console.warn('exportSlabImage failed', err);
    showToast('画像のエクスポートに失敗しました');
  }
}

// Visual Stage の動的ステージ演出（要点カード・手順ステップ・STAGE バッジのクリック操作）を結線する（FR-017, DD-VTPL-015）
export function setupVisualStageInteractions() {
  const visContainer = document.getElementById('visual-stage-container');
  if (!visContainer) return;

  // 紙は操作できないため、スポットライト・章の注目による減光を外した誌面を刷る（FR-036, DD-VTPL-131）
  window.addEventListener('beforeprint', () => clearVisualStageSpotlight(visContainer));

  visContainer.addEventListener('click', event => {
    // 表紙の目次: 選んだ章の先頭までスクロールする（FR-020, DD-VTPL-042）
    const agendaItem = event.target.closest('.vs-cover-agenda-item');
    if (agendaItem) {
      const slab = visContainer.querySelector(`.exhibition-slab[data-stage-no="${agendaItem.dataset.stageTarget}"]`);
      if (slab) slab.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      return;
    }

    // スラブ画像エクスポート・クリップボードコピー（FR-026, DD-VTPL-120）
    const copyBtn = event.target.closest('.btn-copy-slab');
    if (copyBtn) {
      const slab = copyBtn.closest('.exhibition-slab');
      if (slab) copySlabImage(slab);
      return;
    }
    const exportBtn = event.target.closest('.btn-export-slab');
    if (exportBtn) {
      const slab = exportBtn.closest('.exhibition-slab');
      if (slab) exportSlabImage(slab);
      return;
    }

    // コード・ショーケースのワンクリックコピー（FR-031, DD-VTPL-038）
    const codeCopyBtn = event.target.closest('.vs-code-copy-btn');
    if (codeCopyBtn) {
      const pre = codeCopyBtn.closest('pre');
      const codeEl = pre && pre.querySelector('code');
      const codeText = codeEl ? codeEl.textContent : '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeText).catch(() => {});
      }
      codeCopyBtn.setAttribute('data-copy-label', 'Copied');
      codeCopyBtn.classList.add('is-copied');
      showToast('コードをクリップボードにコピーしました');
      setTimeout(() => {
        codeCopyBtn.setAttribute('data-copy-label', 'Copy');
        codeCopyBtn.classList.remove('is-copied');
      }, 1600);
      return;
    }

    if (event.target.closest('a, button')) return;

    const badge = event.target.closest('.exhibition-num-badge');
    if (badge) {
      const slab = badge.closest('.exhibition-slab');
      const wrap = badge.closest('.exhibition-wrap');
      if (!slab || !wrap) return;
      slab.classList.toggle('is-stage-focused');
      wrap.classList.toggle('has-stage-focus', Boolean(wrap.querySelector('.exhibition-slab.is-stage-focused')));
      return;
    }

    const pointItem = event.target.closest('.vs-points > li');
    if (pointItem) {
      const list = pointItem.parentElement;
      const willSpotlight = !pointItem.classList.contains('is-spotlight');
      Array.from(list.children).forEach(li => li.classList.remove('is-spotlight'));
      if (willSpotlight) pointItem.classList.add('is-spotlight');
      list.classList.toggle('has-spotlight', willSpotlight);
      return;
    }

    const stepItem = event.target.closest('.vs-steps > li');
    if (stepItem) {
      const list = stepItem.parentElement;
      const items = Array.from(list.children);
      const targetIdx = items.indexOf(stepItem);
      const willSpotlight = !stepItem.classList.contains('is-spotlight');
      items.forEach((li, idx) => {
        li.classList.toggle('is-spotlight', willSpotlight && idx === targetIdx);
        li.classList.toggle('is-reached', willSpotlight && idx <= targetIdx);
      });
      list.classList.toggle('has-spotlight', willSpotlight);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') clearVisualStageSpotlight(visContainer);
  });
}

/* ==========================================================================
   Visualモードの表紙（FR-020）と誌面の表（FR-021）
   ========================================================================== */
