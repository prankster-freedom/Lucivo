/* ==========================================================================
   アプリケーション・コアエンジン
   ========================================================================== */
function fnv1aHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const label = document.getElementById('toast-message');
  if (!toast || !label) return;
  label.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 2000);
}

function updateStatus(text, type = 'info') {
  const pill = document.getElementById('telemetry-pill');
  const dot = document.getElementById('telemetry-dot');
  const status = document.getElementById('telemetry-status');
  if (!pill || !dot || !status) return;
  status.textContent = text;
  pill.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono shadow-md backdrop-blur-md transition-all';
  if (type === 'success') {
    pill.classList.add('bg-emerald-500/10', 'text-emerald-600', 'border-emerald-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
  } else if (type === 'warning') {
    pill.classList.add('bg-amber-500/10', 'text-amber-600', 'border-amber-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-500';
  } else {
    pill.classList.add('bg-blue-500/10', 'text-blue-600', 'border-blue-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-blue-500';
  }
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const THEMES = {
  light: {
    cobalt: {
      name: 'Cobalt',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#2563EB',
      nodeText: '#0F172A',
      edgeStroke: '#475569',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#1E3A8A'
    },
    emerald: {
      name: 'Emerald',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#059669',
      nodeText: '#0F172A',
      edgeStroke: '#475569',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#064E3B'
    },
    amber: {
      name: 'Amber',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#D97706',
      nodeText: '#0F172A',
      edgeStroke: '#57534E',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#78350F'
    },
    slate: {
      name: 'Royal',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#7C3AED',
      nodeText: '#0F172A',
      edgeStroke: '#475569',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#4C1D95'
    }
  },
  dark: {
    cobalt: {
      name: 'Cobalt',
      canvasBg: '#0F172A',
      clusterBg: '#0B1120',
      clusterBorder: '#334155',
      nodeBg: '#1E293B',
      nodeStroke: '#38BDF8',
      nodeText: '#F8FAFC',
      edgeStroke: '#94A3B8',
      edgeLabelBg: '#1E293B',
      edgeLabelBorder: '#475569',
      edgeLabelText: '#E0F2FE'
    },
    emerald: {
      name: 'Emerald',
      canvasBg: '#06120E',
      clusterBg: '#091914',
      clusterBorder: '#1E4638',
      nodeBg: '#0F2920',
      nodeStroke: '#34D399',
      nodeText: '#F8FAFC',
      edgeStroke: '#6EE7B7',
      edgeLabelBg: '#0F2920',
      edgeLabelBorder: '#1E4638',
      edgeLabelText: '#D1FAE5'
    },
    amber: {
      name: 'Amber',
      canvasBg: '#120E07',
      clusterBg: '#1C150B',
      clusterBorder: '#452A0B',
      nodeBg: '#291D0E',
      nodeStroke: '#FBBF24',
      nodeText: '#F8FAFC',
      edgeStroke: '#FCD34D',
      edgeLabelBg: '#291D0E',
      edgeLabelBorder: '#452A0B',
      edgeLabelText: '#FEF3C7'
    },
    slate: {
      name: 'Royal',
      canvasBg: '#0D0917',
      clusterBg: '#150F26',
      clusterBorder: '#3B2366',
      nodeBg: '#21173B',
      nodeStroke: '#C084FC',
      nodeText: '#F8FAFC',
      edgeStroke: '#D8B4FE',
      edgeLabelBg: '#21173B',
      edgeLabelBorder: '#3B2366',
      edgeLabelText: '#F3E8FF'
    }
  }
};

const SAMPLE_DOC = `# 次世代インテリジェント分散基盤・アーキテクチャ仕様書

<div class="flex flex-wrap items-center gap-2 mb-4 text-xs font-mono">
  <span class="badge-tag bg-blue-500/10 text-blue-600 border border-blue-500/20">Version 4.5-PROD</span>
  <span class="badge-tag bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Status: Verified</span>
  <span class="badge-tag bg-purple-500/10 text-purple-600 border border-purple-500/20">Infographic Ready</span>
</div>

本ドキュメントは、超低遅延分散基盤における推論パイプライン（階層フローチャート）、FIDO2認証シーケンス、および自律制御フェイルオーバー（ステートマシン）のシステム統合仕様を定義します。

## 1. 推論パイプライン・トポロジー

<div class="callout-box">
  <strong>設計方針:</strong> クライアント流入から永続化層までを3層の垂直パイプラインに集約し、モバイルおよび大型ディスプレイ双方で視覚的な黄金比を維持します。
</div>

\`\`\`mermaid
flowchart TD
  subgraph Tier1 ["01: Ingress & Edge Tier"]
    CLIENT["Client Application<br/><small>Web / iOS / Android</small>"]
    WAF["Edge Security WAF<br/><small>TLS 1.3 & DDoS Guard</small>"]
  end

  subgraph Tier2 ["02: Compute & Inference Mesh"]
    SCHEDULER["Token Batcher & Router<br/><small>Dynamic Load Balancing</small>"]
    DECODER["Draft Decoder L1<br/><small>Speculative Fast Engine</small>"]
    WORKERS["Verify Mesh Cluster<br/><small>Multi-GPU Verification</small>"]
  end

  subgraph Tier3 ["03: Persistence & Storage Tier"]
    KVCACHE["Distributed KV Cache<br/><small>In-Memory Context</small>"]
    VECTOR["Vector Index DB<br/><small>Semantic Search</small>"]
  end

  CLIENT -->|Encrypted Session| WAF
  WAF -->|gRPC Direct Stream| SCHEDULER
  SCHEDULER -->|Draft Tokens| DECODER
  DECODER -->|Parallel Verify| WORKERS
  SCHEDULER <-->|Context Sync| KVCACHE
  WORKERS <-->|RAG Query| VECTOR
\`\`\`

## 2. ゼロトラスト・パスキー認証

<div class="callout-box">
  <strong>プロトコル要件:</strong> FIDO2/WebAuthn規格に基づく公開鍵暗号認証と、ミリ秒レベルのリアルタイム不正検知スコアリングを同期実行します。
</div>

\`\`\`mermaid
sequenceDiagram
  autonumber
  participant User as ユーザー端末
  participant API as API Gateway
  participant Auth as FIDO2 Core
  participant Ledger as Core Ledger

  User->>API: 署名付き要求 (WebAuthn)
  activate API
  API->>Auth: 暗号署名＆生体検証
  activate Auth
  Note over Auth: Secure Enclave検証
  Auth-->>API: 署名検証 OK (Valid)
  deactivate Auth

  API->>Ledger: トランザクション確定
  activate Ledger
  Ledger-->>API: Commit ACK (0x9f...)
  deactivate Ledger

  API-->>User: 201 Created (完了)
  deactivate API
\`\`\`

## 3. 自律制御フェイルオーバー・モデル

<div class="callout-box">
  <strong>状態遷移設計:</strong> 正常航行（ActiveOps）から障害検知（FaultLock）、安全着陸（Landing）に至る垂直ライフサイクルを定義します。
</div>

\`\`\`mermaid
stateDiagram-v2
  direction TB
  [*] --> Standby: Boot
  Standby --> PreFlight: Diagnostics
  PreFlight --> ActiveOps: Check OK
  PreFlight --> FaultLock: Anomaly

  state ActiveOps {
    [*] --> Cruising
    Cruising --> Avoidance: Alert
    Avoidance --> Cruising: Clear
    Cruising --> Docking: Arrival
  }

  ActiveOps --> Failover: Link Loss
  Failover --> ActiveOps: Restored
  Failover --> Landing: Low Battery
  Landing --> Terminated
  FaultLock --> Terminated
  Terminated --> [*]
\`\`\`

## 4. コア性能マトリクス

| 評価指標 | 従来の構成 | Lucivo Mesh Architecture | ステータス |
| :--- | :--- | :--- | :--- |
| **平均応答遅延 (p99)** | 142ms（過密時スパイクあり） | **18ms（投機的デコードによる短縮）** | <span class="badge-tag bg-emerald-500/10 text-emerald-600">SUB-MS</span> |
| **キャッシュ再描画** | テキスト入力ごとにSVGフル再生成 | **ハッシュ一致時に 0.0ms で即時マウント** | <span class="badge-tag bg-blue-500/10 text-blue-600">ZERO-WAIT</span> |
| **障害時フォールバック** | 単一ノード障害でパイプライン停止 | **LKG（直前の正常状態）を維持して自動復帰** | <span class="badge-tag bg-purple-500/10 text-purple-600">RESILIENT</span> |
`;

const state = {
  appearance: 'light',
  palette: 'cobalt',
  curve: 'smooth',
  viewMode: 'split',
  isVisualMode: false,
  infographicStyle: 'shapes'
};

const svgCache = new Map();
const lkgCache = new Map();
let renderDebounceTimer = null;

function getThemeSpec() {
  const mode = THEMES[state.appearance] || THEMES.light;
  return mode[state.palette] || mode.cobalt;
}

function syncCssTokens() {
  const spec = getThemeSpec();
  const root = document.documentElement;
  root.style.setProperty('--diag-canvas', spec.canvasBg);
  root.style.setProperty('--diag-cluster-bg', spec.clusterBg);
  root.style.setProperty('--diag-cluster-border', spec.clusterBorder);
  root.style.setProperty('--diag-node-bg', spec.nodeBg);
  root.style.setProperty('--diag-node-stroke', spec.nodeStroke);
  root.style.setProperty('--diag-node-text', spec.nodeText);
  root.style.setProperty('--diag-edge', spec.edgeStroke);
  root.style.setProperty('--accent', spec.nodeStroke);
}

function getMermaidCurve() {
  if (state.curve === 'step') return 'stepAfter';
  if (state.curve === 'straight') return 'linear';
  return 'basis';
}

function setupMermaid() {
  syncCssTokens();
  const spec = getThemeSpec();
  const isDark = state.appearance === 'dark';

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'loose',
    fontFamily: '"Inter", "Noto Sans JP", -apple-system, sans-serif',
    fontSize: 13,
    flowchart: {
      curve: getMermaidCurve(),
      padding: 18,
      nodeSpacing: 44,
      rankSpacing: 56,
      htmlLabels: true,
      useMaxWidth: true
    },
    sequence: {
      diagramMarginX: 24,
      diagramMarginY: 20,
      actorMargin: 54,
      width: 155,
      height: 50,
      boxMargin: 12,
      useMaxWidth: true
    },
    state: {
      padding: 16,
      dividerMargin: 18,
      sizeUnit: 8,
      useMaxWidth: true
    },
    themeVariables: {
      darkMode: isDark,
      background: 'transparent',
      mainBkg: spec.nodeBg,
      primaryColor: spec.nodeBg,
      primaryTextColor: spec.nodeText,
      primaryBorderColor: spec.nodeStroke,
      lineColor: spec.edgeStroke,
      textColor: spec.nodeText,
      fontSize: '13px',

      clusterBkg: spec.clusterBg,
      clusterBorder: spec.clusterBorder,
      tertiaryColor: spec.clusterBg,
      tertiaryBorderColor: spec.clusterBorder,
      titleColor: spec.nodeText,

      compositeBackground: spec.clusterBg,
      compositeBorder: spec.clusterBorder,
      compositeTitleBackground: spec.clusterBg,
      stateBkg: spec.nodeBg,
      stateBorder: spec.nodeStroke,
      stateLabelColor: spec.nodeText,
      transitionColor: spec.edgeStroke,
      transitionLabelColor: spec.edgeLabelText,

      actorBkg: spec.nodeBg,
      actorBorder: spec.nodeStroke,
      actorTextColor: spec.nodeText,
      actorLineColor: spec.clusterBorder,
      signalColor: spec.edgeStroke,
      signalTextColor: spec.nodeText,
      labelBoxBkgColor: spec.edgeLabelBg,
      labelBoxBorderColor: spec.edgeLabelBorder,
      labelTextColor: spec.edgeLabelText,
      loopTextColor: spec.nodeText,
      noteBorderColor: spec.nodeStroke,
      noteBkgColor: spec.clusterBg,
      noteTextColor: spec.nodeText
    }
  });
}

/* ==========================================================================
   SVG ポストプロセッサ (通常モード vs リファレンス4大インフォグラフィック)
   ========================================================================== */
function postProcessSvg(rawSvg, isVisualMode, blockIndex = 0) {
  try {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rawSvg;
    const svg = wrapper.querySelector('svg');
    if (!svg) return rawSvg;

    const isDark = state.appearance === 'dark';
    const spec = getThemeSpec();

    // 1. 通常モード：端正なエンジニアリング設計図スタイル
    if (!isVisualMode) {
      const targetTextColor = isDark ? '#F8FAFC' : '#0F172A';
      svg.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text.actor, text.noteText, .nodeLabel, .stateLabel, .messageText, .loopText, .labelText').forEach(el => {
        el.style.setProperty('color', targetTextColor, 'important');
        el.style.setProperty('fill', targetTextColor, 'important');
      });
      svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach(g => {
        const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
        if (!rect) return;
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.style.setProperty('fill', spec.nodeBg, 'important');
        rect.style.setProperty('stroke', spec.nodeStroke, 'important');
        rect.style.setProperty('stroke-width', '1.75px', 'important');
      });
      svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition, line.messageLine0, line.messageLine1').forEach(p => {
        p.style.setProperty('stroke', spec.edgeStroke, 'important');
        p.style.setProperty('stroke-width', '2px', 'important');
      });
      return svg.outerHTML;
    }

    // ======================================================================
    // 2. Visual Stage モード：インフォグラフィック・エンジン
    // ======================================================================
    const styleMode = state.infographicStyle;

    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }

    const uid = Math.random().toString(36).slice(2, 7);

    defs.insertAdjacentHTML('beforeend', `
      <filter id="vis-soft-shadow-${uid}" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="6" stdDeviation="5.5" flood-color="#0F172A" flood-opacity="0.16" />
      </filter>
      <filter id="vis-card-shadow-${uid}" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.14" />
      </filter>

      <linearGradient id="vis-g-amber-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E89B27" />
        <stop offset="100%" stop-color="#F7D05C" />
      </linearGradient>
      <linearGradient id="vis-g-aqua-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#73E8F4" />
        <stop offset="100%" stop-color="#DAEDFA" />
      </linearGradient>
      <linearGradient id="vis-g-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#E87C6C" />
        <stop offset="100%" stop-color="#F6CBC3" />
      </linearGradient>
      <linearGradient id="vis-g-lime-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#8CEE97" />
        <stop offset="100%" stop-color="#CEF65B" />
      </linearGradient>

      <linearGradient id="vis-cap-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E29578" />
        <stop offset="100%" stop-color="#ECAC94" />
      </linearGradient>
      <linearGradient id="vis-cap-gold-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E5AD35" />
        <stop offset="100%" stop-color="#F3C868" />
      </linearGradient>
      <linearGradient id="vis-cap-violet-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#9AAEE4" />
        <stop offset="100%" stop-color="#BAC7EC" />
      </linearGradient>
      <linearGradient id="vis-cap-teal-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#64ADB0" />
        <stop offset="100%" stop-color="#88C4C6" />
      </linearGradient>
    `);

    // サブグラフの磨りガラス・フレーム化
    svg.querySelectorAll('g.cluster, g.statediagram-cluster').forEach(cluster => {
      const outerRect = cluster.querySelector('rect.outer') || cluster.querySelector('rect');
      if (outerRect) {
        outerRect.setAttribute('rx', '18');
        outerRect.setAttribute('ry', '18');
        outerRect.style.setProperty('fill', isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.65)', 'important');
        outerRect.style.setProperty('stroke', isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(255, 255, 255, 0.95)', 'important');
        outerRect.style.setProperty('stroke-width', '2px', 'important');
      }
    });

    // ----------------------------------------------------------------------
    // スタイル 1: 🎨 Pastel Shapes (リファレンス1準拠)
    // ----------------------------------------------------------------------
    if (styleMode === 'shapes') {
      svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
        const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
        const polygon = g.querySelector('polygon');
        const text = (g.textContent || '').toLowerCase();

        g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
          el.style.setProperty('color', '#1E293B', 'important');
          el.style.setProperty('fill', '#1E293B', 'important');
          el.style.setProperty('font-weight', '700', 'important');
        });

        if (rect) {
          rect.style.setProperty('stroke', 'none', 'important');
          rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);

          if (idx === 0 || text.includes('client') || text.includes('start') || text.includes('standby')) {
            rect.setAttribute('rx', '9999');
            rect.setAttribute('ry', '9999');
            rect.style.setProperty('fill', '#FFFFFF', 'important');
          } else if (text.includes('terminal') || text.includes('landing') || text.includes('end') || text.includes('終了')) {
            rect.setAttribute('rx', '9999');
            rect.setAttribute('ry', '9999');
            rect.style.setProperty('fill', `url(#vis-g-lime-${uid})`, 'important');
          } else {
            rect.setAttribute('rx', '10');
            rect.setAttribute('ry', '10');
            rect.style.setProperty('fill', `url(#vis-g-amber-${uid})`, 'important');
          }
        }

        if (polygon) {
          polygon.style.setProperty('stroke', 'none', 'important');
          polygon.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
          const points = polygon.getAttribute('points') || '';
          if (points.split(' ').length <= 5) {
            polygon.style.setProperty('fill', `url(#vis-g-aqua-${uid})`, 'important');
          } else {
            polygon.style.setProperty('fill', `url(#vis-g-coral-${uid})`, 'important');
          }
        }
      });

      svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition, line.messageLine0, line.messageLine1').forEach(p => {
        p.style.setProperty('stroke', '#475569', 'important');
        p.style.setProperty('stroke-width', '2px', 'important');
        p.style.setProperty('stroke-dasharray', 'none', 'important');
      });
      svg.querySelectorAll('marker path').forEach(m => {
        m.style.setProperty('fill', '#475569', 'important');
        m.style.setProperty('stroke', '#475569', 'important');
      });
    }

    // ----------------------------------------------------------------------
    // スタイル 2: 📋 2-Tier Cards (リファレンス4準拠)
    // ----------------------------------------------------------------------
    else if (styleMode === 'cards') {
      const capGradients = [
        `url(#vis-cap-coral-${uid})`,
        `url(#vis-cap-gold-${uid})`,
        `url(#vis-cap-violet-${uid})`,
        `url(#vis-cap-teal-${uid})`
      ];
      const stepLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
        const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
        if (!rect) return;

        const x = parseFloat(rect.getAttribute('x') || 0);
        const y = parseFloat(rect.getAttribute('y') || 0);
        const w = parseFloat(rect.getAttribute('width') || 0);
        const h = parseFloat(rect.getAttribute('height') || 0);
        if (w <= 10 || h <= 10) return;

        rect.setAttribute('rx', '12');
        rect.setAttribute('ry', '12');
        rect.style.setProperty('fill', '#FFFFFF', 'important');
        rect.style.setProperty('stroke', '#E2E8F0', 'important');
        rect.style.setProperty('stroke-width', '1.5px', 'important');
        rect.setAttribute('filter', `url(#vis-card-shadow-${uid})`);

        const cap = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        cap.setAttribute('x', String(x));
        cap.setAttribute('y', String(y));
        cap.setAttribute('width', String(w));
        const capH = Math.min(24, h * 0.38);
        cap.setAttribute('height', String(capH));
        cap.setAttribute('rx', '12');
        cap.setAttribute('ry', '12');
        cap.style.setProperty('fill', capGradients[idx % capGradients.length], 'important');
        cap.style.setProperty('stroke', 'none', 'important');
        cap.style.setProperty('pointer-events', 'none');
        g.appendChild(cap);

        const stepText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        stepText.setAttribute('x', String(x + 10));
        stepText.setAttribute('y', String(y + capH - 7));
        stepText.setAttribute('fill', '#FFFFFF');
        stepText.setAttribute('font-size', '11');
        stepText.setAttribute('font-weight', '800');
        stepText.setAttribute('font-family', '"Plus Jakarta Sans", sans-serif');
        stepText.textContent = stepLetters[idx % stepLetters.length];
        g.appendChild(stepText);

        g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
          el.style.setProperty('color', '#0F172A', 'important');
          el.style.setProperty('fill', '#0F172A', 'important');
          el.style.setProperty('font-weight', '700', 'important');
        });
      });

      svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
        p.style.setProperty('stroke', '#64748B', 'important');
        p.style.setProperty('stroke-width', '2px', 'important');
      });
    }

    // ----------------------------------------------------------------------
    // スタイル 3: ⭕ Vibrant Circles & Dots (リファレンス2準拠)
    // ----------------------------------------------------------------------
    else if (styleMode === 'circles') {
      const circlePalette = ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763', '#6D597A', '#3D464D'];

      svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
        const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
        const color = circlePalette[idx % circlePalette.length];

        if (rect) {
          rect.setAttribute('rx', '9999');
          rect.setAttribute('ry', '9999');
          rect.style.setProperty('fill', color, 'important');
          rect.style.setProperty('stroke', '#FFFFFF', 'important');
          rect.style.setProperty('stroke-width', '2.5px', 'important');
          rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
        }

        g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
          el.style.setProperty('color', '#FFFFFF', 'important');
          el.style.setProperty('fill', '#FFFFFF', 'important');
          el.style.setProperty('font-weight', '700', 'important');
        });
      });

      svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach((p, idx) => {
        const color = circlePalette[idx % circlePalette.length];
        p.style.setProperty('stroke', color, 'important');
        p.style.setProperty('stroke-width', '4px', 'important');
        p.style.setProperty('stroke-linecap', 'round', 'important');
        p.style.setProperty('stroke-dasharray', '0 9', 'important');
      });
      svg.querySelectorAll('marker path').forEach(m => {
        m.style.setProperty('fill', '#7EA6BF', 'important');
      });
    }

    // ----------------------------------------------------------------------
    // スタイル 4: 📖 Editorial Cream (リファレンス3準拠)
    // ----------------------------------------------------------------------
    else if (styleMode === 'editorial') {
      svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
        const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
        const text = (g.textContent || '').toLowerCase();

        if (rect) {
          if (idx === 0 || text.includes('start') || text.includes('client')) {
            rect.setAttribute('rx', '9999');
            rect.setAttribute('ry', '9999');
            rect.style.setProperty('fill', '#FFFFFF', 'important');
            rect.style.setProperty('stroke', '#E29578', 'important');
            rect.style.setProperty('stroke-width', '3px', 'important');
          } else if (text.includes('type') || text.includes('terminat') || text.includes('landing') || text.includes('docking')) {
            rect.setAttribute('rx', '8');
            rect.setAttribute('ry', '8');
            rect.style.setProperty('fill', '#D68C8C', 'important');
            rect.style.setProperty('stroke', 'none', 'important');
            g.querySelectorAll('foreignObject div, foreignObject span, text').forEach(el => {
              el.style.setProperty('color', '#FFFFFF', 'important');
              el.style.setProperty('fill', '#FFFFFF', 'important');
            });
            return;
          } else {
            rect.setAttribute('rx', '9999');
            rect.setAttribute('ry', '9999');
            rect.style.setProperty('fill', '#FFFFFF', 'important');
            rect.style.setProperty('stroke', 'none', 'important');
            rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
          }
        }

        g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
          el.style.setProperty('color', '#2B2D42', 'important');
          el.style.setProperty('fill', '#2B2D42', 'important');
          el.style.setProperty('font-weight', '600', 'important');
        });
      });

      svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
        p.style.setProperty('stroke', '#8FA876', 'important');
        p.style.setProperty('stroke-width', '3.5px', 'important');
        p.style.setProperty('stroke-dasharray', 'none', 'important');
      });
      svg.querySelectorAll('marker path').forEach(m => {
        m.style.setProperty('fill', '#8FA876', 'important');
        m.style.setProperty('stroke', '#8FA876', 'important');
      });
    }

    // シーケンス図のアクターもインフォグラフィック化
    svg.querySelectorAll('rect.actor').forEach((rect, idx) => {
      rect.setAttribute('rx', '10');
      rect.setAttribute('ry', '10');
      rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
      if (styleMode === 'shapes') {
        rect.style.setProperty('fill', `url(#vis-g-amber-${uid})`, 'important');
        rect.style.setProperty('stroke', 'none', 'important');
      } else if (styleMode === 'circles') {
        rect.style.setProperty('fill', ['#7EA6BF', '#D45D53', '#7D9763', '#ECB674'][idx % 4], 'important');
        rect.style.setProperty('stroke', '#FFFFFF', 'important');
        rect.style.setProperty('stroke-width', '2px', 'important');
      } else {
        rect.style.setProperty('fill', '#FFFFFF', 'important');
        rect.style.setProperty('stroke', '#CBD5E1', 'important');
      }
    });

    return svg.outerHTML;
  } catch (e) {
    return rawSvg;
  }
}

/* ==========================================================================
   ダイアグラムカード生成
   ========================================================================== */
function createDiagramCard(index, svgHtml, isRendering, isVisual) {
  const content = isRendering
    ? `<div class="py-12 font-mono text-xs text-blue-500 animate-pulse flex items-center justify-center">Rendering Diagram 0${index + 1}...</div>`
    : svgHtml;

  const cardClass = isVisual ? `exhibition-diagram-card infographic-bg-${state.infographicStyle}` : 'diagram-frame';
  const headerClass = isVisual ? 'exhibition-diagram-header' : 'diagram-frame-header';
  const viewportClass = isVisual ? 'exhibition-viewport' : 'diagram-viewport';
  const badgeLabel = isVisual ? `INFOGRAPHIC // 0${index + 1}` : `DIAGRAM 0${index + 1}`;

  return `
    <div id="diagram-frame-${index}" class="${cardClass}">
      <div class="${headerClass}">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${isVisual ? 'bg-amber-500 shadow-sm' : 'bg-blue-500'}"></span>
          <span class="font-mono text-[11px] font-bold tracking-wider" style="color: var(--text-primary);">${badgeLabel}</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="pill-container mr-1.5">
            <button type="button" data-action="scale-fit" data-index="${index}" class="scale-btn pill-btn is-active text-[10px]">Fit</button>
            <button type="button" data-action="scale-actual" data-index="${index}" class="scale-btn pill-btn text-[10px]">1:1</button>
          </div>
          <button type="button" data-action="png" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">PNG</button>
          <button type="button" data-action="svg" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">SVG</button>
          <button type="button" data-action="zoom" data-index="${index}" class="text-[11px] font-bold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer">Expand</button>
        </div>
      </div>
      <div class="${viewportClass}" data-stage-index="${index}">
        ${content}
      </div>
    </div>
  `;
}

/* ==========================================================================
   Visual Stage 展示レイアウト構築
   ========================================================================== */
function buildVisualStageHtml(cleanHtml) {
  const temp = document.createElement('div');
  temp.innerHTML = cleanHtml;

  let heroTitle = 'Architecture Exhibition Showcase';
  const h1 = temp.querySelector('h1');
  if (h1) {
    heroTitle = h1.textContent;
    h1.remove();
  }

  const slabs = [];
  let currentNodes = [];
  Array.from(temp.childNodes).forEach(node => {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      if (currentNodes.length > 0) slabs.push(currentNodes);
      currentNodes = [node];
    } else {
      currentNodes.push(node);
    }
  });
  if (currentNodes.length > 0) slabs.push(currentNodes);

  let slabsHtml = '';
  let sectionCounter = 0;

  slabs.forEach((nodes) => {
    const wrapper = document.createElement('div');
    nodes.forEach(n => wrapper.appendChild(n.cloneNode(true)));
    const h2 = wrapper.querySelector('h2');
    if (h2) {
      sectionCounter++;
      const numStr = String(sectionCounter).padStart(2, '0');
      const rawTitle = h2.textContent.replace(/^\d+\.\s*/, '');
      h2.innerHTML = `<span class="exhibition-num-badge">STAGE ${numStr}</span><span>${rawTitle}</span>`;
    }
    slabsHtml += `<section class="exhibition-slab">${wrapper.innerHTML}</section>`;
  });

  return `
    <div class="exhibition-wrap">
      <div class="exhibition-hero">
        <span class="font-mono text-[11px] font-bold tracking-widest uppercase text-slate-400">
          EDITORIAL INFOGRAPHIC STUDIO
        </span>
        <div class="four-color-bar">
          <span class="bg-[#E29578]"></span>
          <span class="bg-[#E6B34B]"></span>
          <span class="bg-[#A3B4E4]"></span>
          <span class="bg-[#6DB1B4]"></span>
        </div>
        <h1 class="font-display font-extrabold text-xl sm:text-2xl tracking-tight leading-tight mt-1" style="color: var(--text-primary);">
          ${heroTitle}
        </h1>
      </div>
      ${slabsHtml}
    </div>
  `;
}

/* ==========================================================================
   メインレンダリングループ
   ========================================================================== */
function renderApp() {
  const rawMarkdown = document.getElementById('markdown-editor').value;
  const parsed = marked.lexer(rawMarkdown);

  const mermaidBlocks = [];
  const tokensToKeep = [];

  parsed.forEach(token => {
    if (token.type === 'code' && (token.lang || '').trim().toLowerCase() === 'mermaid') {
      const index = mermaidBlocks.length;
      const code = token.text.trim();
      const hash = fnv1aHash(code + state.appearance + state.palette + state.curve + state.infographicStyle + (state.isVisualMode ? 'vis' : 'std'));
      mermaidBlocks.push({ index, code, hash });
      tokensToKeep.push({
        type: 'html',
        raw: `<div class="lucivo-slot" data-slot="${index}"></div>`,
        text: `<div class="lucivo-slot" data-slot="${index}"></div>`
      });
    } else {
      tokensToKeep.push(token);
    }
  });

  const rawHtml = marked.parser(tokensToKeep);
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['div', 'span', 'strong', 'small'],
    ADD_ATTR: ['class', 'data-slot', 'style']
  });

  const stdContainer = document.getElementById('standard-doc-container');
  const visContainer = document.getElementById('visual-stage-container');
  const stdWrapper = document.getElementById('standard-doc-wrapper');

  if (state.isVisualMode) {
    stdWrapper.classList.add('hidden');
    visContainer.classList.remove('hidden');
    visContainer.innerHTML = buildVisualStageHtml(cleanHtml);
  } else {
    visContainer.classList.add('hidden');
    stdWrapper.classList.remove('hidden');
    stdContainer.innerHTML = cleanHtml;
  }

  const activeContainer = state.isVisualMode ? visContainer : stdContainer;
  const slots = activeContainer.querySelectorAll('.lucivo-slot');

  const dirtyBlocks = [];

  slots.forEach(slot => {
    const idx = parseInt(slot.getAttribute('data-slot'), 10);
    const block = mermaidBlocks[idx];
    if (!block) return;

    const modeTag = state.isVisualMode ? `vis-${state.infographicStyle}` : 'std';
    const cacheKey = `${block.hash}-${modeTag}`;

    if (svgCache.has(cacheKey)) {
      slot.outerHTML = createDiagramCard(idx, svgCache.get(cacheKey), false, state.isVisualMode);
    } else {
      slot.outerHTML = createDiagramCard(idx, lkgCache.get(idx) || '', true, state.isVisualMode);
      dirtyBlocks.push({ ...block, modeTag, cacheKey });
    }
  });

  bindViewportInteractions();

  if (dirtyBlocks.length > 0) {
    processDirtyBlocks(dirtyBlocks);
  } else {
    updateStatus(`• ${mermaidBlocks.length}/${mermaidBlocks.length} Diagrams Ready`, 'success');
  }
}

async function processDirtyBlocks(dirtyBlocks) {
  updateStatus(`Rendering ${dirtyBlocks.length} diagrams...`, 'warning');

  for (const block of dirtyBlocks) {
    const renderId = `mermaid-render-${block.index}-${Date.now()}`;
    try {
      setupMermaid();
      const { svg } = await mermaid.render(renderId, block.code);
      const finalSvg = postProcessSvg(svg, state.isVisualMode, block.index);

      svgCache.set(block.cacheKey, finalSvg);
      lkgCache.set(block.index, finalSvg);

      const stageViewport = document.querySelector(`[data-stage-index="${block.index}"]`);
      if (stageViewport) {
        stageViewport.innerHTML = finalSvg;
      }
    } catch (err) {
      console.error(`Mermaid render failed for block ${block.index}:`, err);
      const fallback = lkgCache.get(block.index);
      const stageViewport = document.querySelector(`[data-stage-index="${block.index}"]`);
      if (stageViewport) {
        if (fallback) {
          stageViewport.innerHTML = fallback;
          showToast('構文エラーのため直前の正常状態を表示');
        } else {
          stageViewport.innerHTML = `<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">構文エラー: 正しいMermaid記法を入力してください</div>`;
        }
      }
    }
  }

  updateStatus(`• All Diagrams Verified`, 'success');
}

/* ==========================================================================
   ビューポート操作イベント
   ========================================================================== */
function bindViewportInteractions() {
  document.querySelectorAll('.scale-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const action = btn.getAttribute('data-action');
      const vp = document.querySelector(`[data-stage-index="${idx}"]`);
      const frame = document.getElementById(`diagram-frame-${idx}`);
      if (!vp || !frame) return;

      frame.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      if (action === 'scale-actual') {
        vp.classList.add('is-actual-size');
      } else {
        vp.classList.remove('is-actual-size');
      }
    };
  });

  document.querySelectorAll('[data-action="svg"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = document.querySelector(`[data-stage-index="${idx}"]`);
      if (!vp) return;
      const svgEl = vp.querySelector('svg');
      if (!svgEl) return;
      downloadBlob(svgEl.outerHTML, `diagram-0${parseInt(idx, 10) + 1}.svg`, 'image/svg+xml');
      showToast(`Diagram 0${parseInt(idx, 10) + 1} SVGをダウンロード`);
    };
  });

  document.querySelectorAll('[data-action="png"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = document.querySelector(`[data-stage-index="${idx}"]`);
      if (!vp) return;
      const svgEl = vp.querySelector('svg');
      if (!svgEl) return;

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2;
        const bbox = svgEl.getBoundingClientRect();
        canvas.width = (bbox.width || 800) * scale;
        canvas.height = (bbox.height || 600) * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = state.appearance === 'dark' ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          const dlUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = dlUrl;
          a.download = `diagram-0${parseInt(idx, 10) + 1}.png`;
          a.click();
          URL.revokeObjectURL(dlUrl);
          showToast(`Diagram 0${parseInt(idx, 10) + 1} PNG (高解像度) をダウンロード`);
        });
        URLObj.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    };
  });

  document.querySelectorAll('[data-action="zoom"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = document.querySelector(`[data-stage-index="${idx}"]`);
      if (!vp) return;
      const svgEl = vp.querySelector('svg');
      if (!svgEl) return;

      const modal = document.getElementById('zoom-modal');
      const zoomCanvas = document.getElementById('zoom-canvas');
      zoomCanvas.innerHTML = svgEl.outerHTML;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    };
  });
}

/* ==========================================================================
   イベントハンドラー結線
   ========================================================================== */
function setupEventListeners() {
  const editor = document.getElementById('markdown-editor');
  editor.addEventListener('input', () => {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(renderApp, 250);
  });

  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.getAttribute('data-view-mode');
      state.viewMode = mode;
      document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const paneEditor = document.getElementById('pane-editor');
      const panePreview = document.getElementById('pane-preview');

      if (mode === 'split') {
        paneEditor.classList.remove('hidden');
        panePreview.classList.remove('hidden');
        paneEditor.className = 'w-full lg:w-[40%] h-[42%] lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r shrink-0 z-10';
      } else if (mode === 'canvas') {
        paneEditor.classList.add('hidden');
        panePreview.classList.remove('hidden');
      } else if (mode === 'editor') {
        paneEditor.classList.remove('hidden');
        panePreview.classList.add('hidden');
        paneEditor.className = 'w-full h-full flex flex-col shrink-0 z-10';
      }
    };
  });

  const btnVisual = document.getElementById('btn-visual-mode');
  btnVisual.onclick = () => {
    state.isVisualMode = !state.isVisualMode;
    if (state.isVisualMode) {
      btnVisual.classList.add('is-active');
      showToast('🎨 Visual Stage (インフォグラフィック) を起動');
    } else {
      btnVisual.classList.remove('is-active');
      showToast('仕様書モードに戻りました');
    }
    renderApp();
  };

  document.querySelectorAll('.info-style-btn').forEach(btn => {
    btn.onclick = () => {
      const style = btn.getAttribute('data-info-style');
      state.infographicStyle = style;
      document.querySelectorAll('.info-style-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      if (!state.isVisualMode) {
        state.isVisualMode = true;
        btnVisual.classList.add('is-active');
      }
      renderApp();
      showToast(`スタイル適用: ${btn.textContent.trim()}`);
    };
  });

  document.querySelectorAll('.curve-option-btn').forEach(btn => {
    btn.onclick = () => {
      const curve = btn.getAttribute('data-curve-set');
      state.curve = curve;
      document.querySelectorAll('.curve-option-btn').forEach(b => {
        b.classList.toggle('is-active', b.getAttribute('data-curve-set') === curve);
      });
      setupMermaid();
      renderApp();
      showToast(`矢印形状: ${curve.toUpperCase()}`);
    };
  });

  document.querySelectorAll('.palette-option-btn').forEach(btn => {
    btn.onclick = () => {
      const pal = btn.getAttribute('data-palette-set');
      state.palette = pal;
      document.querySelectorAll('.palette-option-btn').forEach(b => {
        b.classList.toggle('is-active', b.getAttribute('data-palette-set') === pal);
      });
      const activeLabel = document.getElementById('active-palette-name');
      if (activeLabel) activeLabel.textContent = pal.charAt(0).toUpperCase() + pal.slice(1);
      setupMermaid();
      renderApp();
      showToast(`テーマ色: ${pal.toUpperCase()}`);
    };
  });

  const btnTheme = document.getElementById('btn-theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  btnTheme.onclick = () => {
    state.appearance = state.appearance === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-appearance', state.appearance);
    if (state.appearance === 'dark') {
      iconSun.classList.add('hidden');
      iconMoon.classList.remove('hidden');
    } else {
      iconSun.classList.remove('hidden');
      iconMoon.classList.add('hidden');
    }
    setupMermaid();
    renderApp();
  };

  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('btn-open-settings').onclick = () => {
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
  };
  document.getElementById('btn-close-settings').onclick = () => {
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
  };

  const zoomModal = document.getElementById('zoom-modal');
  document.getElementById('zoom-close-btn').onclick = () => {
    zoomModal.classList.add('hidden');
    zoomModal.classList.remove('flex');
  };

  document.getElementById('btn-export-html').onclick = () => {
    const fullHtml = document.documentElement.outerHTML;
    downloadBlob(fullHtml, 'lucivo-architecture-export.html', 'text/html');
    showToast('単一HTMLファイルをエクスポートしました');
  };

  document.getElementById('btn-test-cache').onclick = () => {
    const t0 = performance.now();
    renderApp();
    const duration = (performance.now() - t0).toFixed(1);
    showToast(`キャッシュ再描画: ${duration}ms (0ms相当)`);
  };

  document.getElementById('btn-test-err').onclick = () => {
    editor.value += '\n\n```mermaid\nflowchart TD\nBROKEN_NODE -->\n```\n';
    renderApp();
  };
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('markdown-editor').value = SAMPLE_DOC;
  document.querySelector('[data-view-mode="split"]').classList.add('is-active');
  setupEventListeners();
  setupMermaid();
  renderApp();
});

