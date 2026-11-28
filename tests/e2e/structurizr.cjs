// Structurizr（C4 モデル）描画・ビュー切替・ドリルダウン・ステージ発表・全ビュー印刷・
// スタンドアロン版フォールバックの E2E テスト（FR-071, ARC-STR-001〜007）
const fs = require('fs');
const path = require('path');
const {
  APP_DIR,
  record,
  openApp,
  setDocument,
  setMode,
  startWebServer
} = require('./helpers.cjs');

const MULTI_VIEW_MD = `# C4 Architecture Demo

## 概要

\`\`\`structurizr view=Containers
workspace "E-Commerce" "EC プラットフォーム構成" {
  !include ignored.dsl

  model {
    u = person "顧客" "商品を購入する利用者" {
      -> web "ブラウザで利用" "HTTPS"
    }
    shop = softwareSystem "EC プラットフォーム" "注文と在庫を管理" {
      group "フロント" {
        web = container "Web アプリ" "SPA" "TypeScript"
      }
      api = container "API サーバー" "業務 API" "Go" {
        ctrl = component "注文コントローラ" "注文受付" "HTTP"
        svc = component "在庫サービス" "引当処理" "Domain"
        ctrl -> svc "在庫確認"
      }
      db = container "DB" "注文データ" "PostgreSQL" {
        tags "Database"
      }
      web -> ctrl "API 呼出" "JSON"
      svc -> db "読み書き" "SQL"
    }
    mail = softwareSystem "外部メール基盤" "メール配信"
    api -> mail "注文確認メール送信" "SMTP"
  }

  views {
    systemContext shop "Context" {
      include *
      autoLayout tb
    }
    container shop "Containers" {
      include *
      title "EC コンテナ構成"
      autoLayout lr
    }
    component api "Components" {
      include *
      autoLayout tb
    }
    theme https://static.structurizr.com/themes/default/theme.json
    styles {
      element "Database" {
        shape Cylinder
        background #2563EB
        color #FFFFFF
      }
    }
  }
}
\`\`\`
`;

const SINGLE_VIEW_MD = `# Single View C4

\`\`\`structurizr-dsl
workspace "Simple" {
  model {
    u = person "User"
    s = softwareSystem "App"
    u -> s "Uses"
  }
}
\`\`\`
`;

const SYNTAX_ERROR_MD = `# Broken C4

\`\`\`structurizr
workspace "Broken" {
  model {
    u = person "User"
\`\`\`
`;

async function waitStructurizrReady(page) {
  await page.waitForFunction(() => {
    const status = document.getElementById('telemetry-status');
    const done = status && !/Rendering/.test(status.textContent || '');
    const hasOutput = Boolean(document.querySelector('svg.lucivo-c4-svg, .c4-error-panel'));
    return done && hasOutput;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(200);
}

async function testStructurizr(browser) {
  const srv = await startWebServer();
  try {
    // Web 版（/ja/）: TC-DIAG-043〜047
    const page = await openApp(browser, { url: srv.url, viewport: { width: 1440, height: 960 } });
    try {
      // TC-DIAG-043: 初期ビュー指定（view=Containers）、タブ切替、ドリルダウン＆パンくず、暗黙的関係、警告バッジ
      await setDocument(page, MULTI_VIEW_MD);
      await waitStructurizrReady(page);

      const initialState = await page.evaluate(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        const tabs = Array.from(document.querySelectorAll('#standard-doc-container .c4-view-tab')).map(el => ({
          text: el.textContent.trim(),
          active: el.classList.contains('is-active')
        }));
        const warnBadge = document.querySelector('#standard-doc-container .c4-warning-badge');
        const drillBadge = svg && svg.querySelector('.c4-drilldown-badge[data-drilldown-view="Components"]');
        return {
          viewKey: svg ? svg.getAttribute('data-c4-view-key') : null,
          tabCount: tabs.length,
          activeTab: tabs.find(t => t.active)?.text || null,
          hasWarnBadge: Boolean(warnBadge),
          warnText: warnBadge ? warnBadge.textContent.trim() : '',
          hasDrillBadge: Boolean(drillBadge),
          hasCustomStyleColor: svg ? svg.outerHTML.includes('#2563EB') : false
        };
      });

      // 警告バッジクリックで詳細展開
      await page.click('#standard-doc-container .c4-warning-badge');
      const warnItems = await page.locator('#standard-doc-container .c4-warning-item').count();

      // ドリルダウン（Containers -> Components）とパンくず戻り
      await page.click('#standard-doc-container .c4-drilldown-badge[data-drilldown-view="Components"]');
      await page.waitForFunction(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return svg && svg.getAttribute('data-c4-view-key') === 'Components';
      });
      const hasBreadcrumb = await page.locator('#standard-doc-container .c4-breadcrumb-btn').isVisible();
      await page.click('#standard-doc-container .c4-breadcrumb-btn');
      await page.waitForFunction(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return svg && svg.getAttribute('data-c4-view-key') === 'Containers';
      });

      // タブ切替で Context へ移り、暗黙的関係（c4-edge-implied）が描画されていることを確認
      await page.click('#standard-doc-container .c4-view-tab >> nth=0');
      await page.waitForFunction(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return svg && svg.getAttribute('data-c4-view-key') === 'Context';
      });
      const impliedCount = await page.locator('#standard-doc-container svg.lucivo-c4-svg g.c4-edge-implied').count();

      const ok43 = initialState.viewKey === 'Containers'
        && initialState.tabCount === 3
        && initialState.activeTab === 'EC コンテナ構成'
        && initialState.hasWarnBadge
        && warnItems >= 2
        && initialState.hasDrillBadge
        && initialState.hasCustomStyleColor
        && hasBreadcrumb
        && impliedCount >= 1
        && page.consoleErrors.length === 0;
      record('TC-DIAG-043', ok43, JSON.stringify({ initialState, warnItems, hasBreadcrumb, impliedCount, errors: page.consoleErrors }));

      // TC-DIAG-044: Expand モーダル内ビュー切替・SVG インライン実色エクスポート・単一ビュー時タブ非表示・致命的構文エラー
      const exportSvgStr = await page.evaluate(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return window.LucivoStructurizr.serializeExportSvg(svg);
      });
      const exportResolved = exportSvgStr.includes('xmlns="http://www.w3.org/2000/svg"')
        && !/style="[^"]*var\(--c4-/.test(exportSvgStr);

      await page.click('#standard-doc-container [data-action="zoom"]');
      await page.waitForFunction(() => !document.getElementById('zoom-modal').classList.contains('hidden'));
      await page.waitForSelector('#zoom-c4-bar .c4-view-tab');
      await page.click('#zoom-c4-bar .c4-view-tab >> nth=1');
      await page.waitForFunction(() => {
        const svg = document.querySelector('#zoom-canvas svg.lucivo-c4-svg');
        return svg && svg.getAttribute('data-c4-view-key') === 'Containers';
      });
      const modalSwitched = await page.evaluate(() =>
        document.querySelector('#zoom-canvas svg.lucivo-c4-svg')?.getAttribute('data-c4-view-key') === 'Containers'
      );
      await page.click('#zoom-close-btn');

      // 単一ビュー時は切替タブを非表示
      await setDocument(page, SINGLE_VIEW_MD);
      await waitStructurizrReady(page);
      const singleViewState = await page.evaluate(() => ({
        hasSvg: Boolean(document.querySelector('#standard-doc-container svg.lucivo-c4-svg')),
        barHidden: document.querySelector('#standard-doc-container .lucivo-structurizr-bar')?.classList.contains('hidden') ?? false,
        tabCount: document.querySelectorAll('#standard-doc-container .c4-view-tab').length
      }));

      // 致命的構文エラー時は行番号付きエラーパネルを表示
      await setDocument(page, SYNTAX_ERROR_MD);
      await waitStructurizrReady(page);
      const errorText = await page.locator('#standard-doc-container .c4-error-panel').textContent();
      const hasErrorPanel = Boolean(errorText && /行目|line/i.test(errorText));

      const ok44 = exportResolved && modalSwitched && singleViewState.hasSvg && singleViewState.barHidden && singleViewState.tabCount === 0 && hasErrorPanel;
      record('TC-DIAG-044', ok44, JSON.stringify({ exportResolved, modalSwitched, singleViewState, hasErrorPanel }));

      // TC-DIAG-045: 全ビュー印刷コンテナ（ensureAllViewsRendered）と @media print 切替
      await setDocument(page, MULTI_VIEW_MD);
      await waitStructurizrReady(page);
      await page.evaluate(() => window.LucivoStructurizr.ensureAllViewsRendered());
      const printItems = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#standard-doc-container .lucivo-structurizr-print-item')).map(el => ({
          key: el.getAttribute('data-print-view-key'),
          hasSvg: Boolean(el.querySelector('svg.lucivo-c4-svg'))
        }))
      );
      await page.emulateMedia({ media: 'print' });
      const printVisibility = await page.evaluate(() => {
        const vp = document.querySelector('#standard-doc-container .lucivo-structurizr-card > .diagram-viewport');
        const bar = document.querySelector('#standard-doc-container .lucivo-structurizr-card > .lucivo-structurizr-bar');
        const printAll = document.querySelector('#standard-doc-container .lucivo-structurizr-card > .lucivo-structurizr-print-all');
        return {
          vpHidden: vp ? getComputedStyle(vp).display === 'none' : false,
          barHidden: bar ? getComputedStyle(bar).display === 'none' : false,
          printAllShown: printAll ? getComputedStyle(printAll).display === 'block' : false
        };
      });
      await page.emulateMedia({ media: 'screen' });
      const ok45 = printItems.length === 3
        && printItems.every(i => i.hasSvg)
        && printVisibility.vpHidden
        && printVisibility.barHidden
        && printVisibility.printAllShown;
      record('TC-DIAG-045', ok45, JSON.stringify({ printItems, printVisibility }));

      // TC-DIAG-046: Visual モード + ステージ発表でのビュー切替（ボタン & [ / ] & Shift+ArrowRight）
      await setMode(page, { style: 'shapes', appearance: 'dark' });
      await waitStructurizrReady(page);
      await page.click('#btn-stage-show');
      await page.waitForFunction(() => document.documentElement.classList.contains('is-stage-show'));
      // 表紙から 1 章（Structurizr 図のあるシーン）へ送る
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(250);
      const stageBefore = await page.evaluate(() => ({
        sceneIdx: window.LucivoStage.showState().index,
        controlsVisible: !document.querySelector('#stage-hud .stage-c4-controls')?.classList.contains('hidden'),
        label: document.querySelector('#stage-hud .stage-c4-label')?.textContent?.trim() || '',
        viewKey: document.querySelector('.exhibition-slab.is-scene svg.lucivo-c4-svg')?.getAttribute('data-c4-view-key') || ''
      }));

      // ] キーで次のビューへ切替（スライド自体は進まないこと）
      await page.keyboard.press(']');
      await page.waitForTimeout(200);
      const stageAfterBracket = await page.evaluate(() => ({
        sceneIdx: window.LucivoStage.showState().index,
        label: document.querySelector('#stage-hud .stage-c4-label')?.textContent?.trim() || '',
        viewKey: document.querySelector('.exhibition-slab.is-scene svg.lucivo-c4-svg')?.getAttribute('data-c4-view-key') || ''
      }));

      // Shift+ArrowLeft で前のビューへ戻る（スライド自体は戻らないこと）
      await page.keyboard.press('Shift+ArrowLeft');
      await page.waitForTimeout(200);
      const stageAfterShiftLeft = await page.evaluate(() => ({
        sceneIdx: window.LucivoStage.showState().index,
        viewKey: document.querySelector('.exhibition-slab.is-scene svg.lucivo-c4-svg')?.getAttribute('data-c4-view-key') || ''
      }));

      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.documentElement.classList.contains('is-stage-show'));

      const ok46 = stageBefore.controlsVisible
        && stageBefore.viewKey === 'Containers'
        && stageAfterBracket.sceneIdx === stageBefore.sceneIdx
        && stageAfterBracket.viewKey === 'Components'
        && stageAfterShiftLeft.sceneIdx === stageBefore.sceneIdx
        && stageAfterShiftLeft.viewKey === 'Containers'
        && srv.notFound.length === 0
        && page.consoleErrors.length === 0;
      record('TC-DIAG-046', ok46, JSON.stringify({ stageBefore, stageAfterBracket, stageAfterShiftLeft, notFound: srv.notFound, errors: page.consoleErrors }));

      // TC-DIAG-048: Phase 2a（!identifiers hierarchical・!const/!constant/!var・theme default＋styles 上書き）
      const PHASE2A_MD = `# Phase 2a Structurizr

\`\`\`structurizr view=Containers
!const APP_NAME "Order Hub"
!constant DB_COLOR #dc2626

workspace "\${APP_NAME}" {
  !identifiers hierarchical

  model {
    u = person "顧客" "利用者"
    ss = softwareSystem "\${APP_NAME}" {
      wa = container "Web UI" "SPA" "TypeScript"
      api = container "Order API" "Backend" "Go" {
        ctrl = component "Order Controller" "HTTP Handler"
      }
      db = container "Order DB" "PostgreSQL" "PostgreSQL" {
        tags "Database"
      }
      wa -> api "API 呼出" "HTTPS"
      api.ctrl -> db "SQL"
    }
    u -> ss.wa "アクセス" "HTTPS"
  }

  views {
    container ss "Containers" {
      include u ss.wa ss.api ss.db
      title "\${APP_NAME} Containers"
      autoLayout lr
    }
    component ss.api "ApiComponents" {
      include *
      autoLayout tb
    }
    theme default
    styles {
      element "Database" {
        shape Cylinder
        background \${DB_COLOR}
        color #ffffff
      }
    }
  }
}
\`\`\`
`;
      await setMode(page, { style: 'std', appearance: 'light' });
      await setDocument(page, PHASE2A_MD);
      await waitStructurizrReady(page);

      const p2aState = await page.evaluate(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        const warnBadge = document.querySelector('#standard-doc-container .c4-warning-badge');
        const activeTab = document.querySelector('#standard-doc-container .c4-view-tab.is-active');
        const drillBadge = svg && svg.querySelector('.c4-drilldown-badge[data-drilldown-view="ApiComponents"]');
        return {
          viewKey: svg ? svg.getAttribute('data-c4-view-key') : null,
          hasWarnBadge: Boolean(warnBadge),
          activeTabText: activeTab ? activeTab.textContent.trim() : '',
          hasDefaultThemePersonColor: svg ? svg.outerHTML.toLowerCase().includes('#08427b') : false,
          hasOverrideDbColor: svg ? svg.outerHTML.toLowerCase().includes('#dc2626') : false,
          hasDrillBadge: Boolean(drillBadge)
        };
      });

      await page.click('#standard-doc-container .c4-drilldown-badge[data-drilldown-view="ApiComponents"]');
      await page.waitForFunction(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return svg && svg.getAttribute('data-c4-view-key') === 'ApiComponents';
      });
      const drilledOk = await page.evaluate(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return Boolean(svg && svg.textContent && svg.textContent.includes('Order Controller'));
      });

      const ok48 = p2aState.viewKey === 'Containers'
        && !p2aState.hasWarnBadge
        && p2aState.activeTabText === 'Order Hub Containers'
        && p2aState.hasDefaultThemePersonColor
        && p2aState.hasOverrideDbColor
        && p2aState.hasDrillBadge
        && drilledOk
        && page.consoleErrors.length === 0;
      record('TC-DIAG-048', ok48, JSON.stringify({ p2aState, drilledOk, errors: page.consoleErrors }));

      // TC-DIAG-049: Phase 2b（filtered ビュー・ベースビュー非表示・式フィルタ）
      const PHASE2B_MD = `# Phase 2b Structurizr

\`\`\`structurizr
workspace "Phase 2b Filter Demo" {
  model {
    u = person "顧客" {
      tags "Frontend"
    }
    shop = softwareSystem "Shop" {
      web = container "Web UI" "SPA" "TypeScript" {
        tags "Frontend,Core"
      }
      api = container "Order API" "REST" "Go" {
        tags "Core"
      }
      worker = container "Async Worker" "Batch" "Go" {
        tags "AsyncWorker"
      }
    }
    u -> web "Browse" "HTTPS" "Sync"
    web -> api "Order" "HTTPS" "Sync"
    api -> worker "Notify" "Queue" "Async"
  }

  views {
    container shop "BaseContainers" {
      include *
      autoLayout lr
    }
    filtered "BaseContainers" include "Core,Relationship" "FilteredCore" {
      title "Core Only"
      default
    }
    container shop "SyncOnly" {
      include *
      exclude relationship.tag==Async
      title "Sync Only"
      autoLayout lr
    }
    container shop "ApiCoupling" {
      include ->api->
      title "API Neighbors"
      autoLayout lr
    }
  }
}
\`\`\`
`;
      await setDocument(page, PHASE2B_MD);
      await waitStructurizrReady(page);

      const p2bInitial = await page.evaluate(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        const tabTexts = Array.from(document.querySelectorAll('#standard-doc-container .c4-view-tab'))
          .map(t => t.textContent.trim());
        const warnBadge = document.querySelector('#standard-doc-container .c4-warning-badge');
        const text = svg ? (svg.textContent || '') : '';
        return {
          viewKey: svg ? svg.getAttribute('data-c4-view-key') : null,
          tabTexts,
          hasWarnBadge: Boolean(warnBadge),
          hasWeb: text.includes('Web UI'),
          hasApi: text.includes('Order API'),
          hasWorker: text.includes('Async Worker'),
          hasCustomer: text.includes('顧客')
        };
      });

      // SyncOnly タブへ切替（Async エッジのみ除外され、Async Worker ノード自体は残る）
      await page.click('#standard-doc-container .c4-view-tab[data-c4-view-idx="1"]');
      await page.waitForFunction(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return svg && svg.getAttribute('data-c4-view-key') === 'SyncOnly';
      });
      const p2bSync = await page.evaluate(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        const text = svg ? (svg.textContent || '') : '';
        return {
          hasWorker: text.includes('Async Worker'),
          hasNotifyEdge: text.includes('Notify'),
          hasOrderEdge: text.includes('Order')
        };
      });

      // ApiCoupling タブへ切替（->api-> により Web UI / Order API / Async Worker のみ表示され、顧客は含まれない）
      await page.click('#standard-doc-container .c4-view-tab[data-c4-view-idx="2"]');
      await page.waitForFunction(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return svg && svg.getAttribute('data-c4-view-key') === 'ApiCoupling';
      });
      const p2bCoupling = await page.evaluate(() => {
        const svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        const text = svg ? (svg.textContent || '') : '';
        return {
          hasWeb: text.includes('Web UI'),
          hasApi: text.includes('Order API'),
          hasWorker: text.includes('Async Worker'),
          hasCustomer: text.includes('顧客')
        };
      });

      const ok49 = !p2bInitial.hasWarnBadge
        && p2bInitial.viewKey === 'FilteredCore'
        && p2bInitial.tabTexts.length === 3
        && p2bInitial.tabTexts[0] === 'Core Only'
        && p2bInitial.tabTexts[1] === 'Sync Only'
        && p2bInitial.tabTexts[2] === 'API Neighbors'
        && p2bInitial.hasWeb && p2bInitial.hasApi && !p2bInitial.hasWorker && !p2bInitial.hasCustomer
        && p2bSync.hasWorker && !p2bSync.hasNotifyEdge && p2bSync.hasOrderEdge
        && p2bCoupling.hasWeb && p2bCoupling.hasApi && p2bCoupling.hasWorker && !p2bCoupling.hasCustomer
        && page.consoleErrors.length === 0;
      record('TC-DIAG-049', ok49, JSON.stringify({ p2bInitial, p2bSync, p2bCoupling, errors: page.consoleErrors }));
    } finally {
      await page.close();
    }

    // TC-DIAG-047: スタンドアロン版（dist/index.html, file://）フォールバック表示 & elkjs 非同梱確認
    const standalonePage = await openApp(browser, { viewport: { width: 1280, height: 900 } });
    try {
      await setDocument(standalonePage, MULTI_VIEW_MD);
      const standaloneState = await standalonePage.evaluate(() => {
        const notice = document.querySelector('#standard-doc-container .lucivo-structurizr-standalone-notice');
        const code = document.querySelector('#standard-doc-container pre > code.language-structurizr');
        const c4Svg = document.querySelector('#standard-doc-container svg.lucivo-c4-svg');
        return {
          hasNotice: Boolean(notice),
          noticeText: notice ? notice.textContent.trim() : '',
          hasCodeBlock: Boolean(code),
          hasC4Svg: Boolean(c4Svg),
          hasGlobal: Boolean(window.LucivoStructurizr)
        };
      });
      const bundleAbsentInDist = !fs.existsSync(path.join(APP_DIR, 'js', 'structurizr.js'));
      const ok47 = standaloneState.hasNotice
        && standaloneState.noticeText.includes('Structurizr DSL')
        && standaloneState.hasCodeBlock
        && !standaloneState.hasC4Svg
        && !standaloneState.hasGlobal
        && bundleAbsentInDist
        && standalonePage.consoleErrors.length === 0;
      record('TC-DIAG-047', ok47, JSON.stringify({ standaloneState, bundleAbsentInDist, errors: standalonePage.consoleErrors }));
    } finally {
      await standalonePage.close();
    }
  } finally {
    await srv.close();
  }
}

module.exports = { testStructurizr };
