/**
 * tests/structurizr-core.test.cjs
 *
 * Structurizr（C4 モデル）コアモジュール（info-string / lexer / parser / view-resolver /
 * text-metrics / layout-engine / elk-layout / svg-renderer）の単体テスト（FR-071, ARC-STR-001〜005）。
 * 実行: node tests/structurizr-core.test.cjs
 */
'use strict';

const assert = require('assert');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');

function loadTsModule(relPath) {
  const built = esbuild.buildSync({
    entryPoints: [path.join(ROOT, relPath)],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false
  });
  const code = built.outputFiles[0].text;
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', code);
  fn(mod, mod.exports, require);
  return mod.exports;
}

const { parseStructurizrInfoString } = loadTsModule('src/ts/diagram/structurizr/info-string.ts');
const { tokenizeStructurizrDsl } = loadTsModule('src/ts/diagram/structurizr/lexer.ts');
const { parseStructurizrDsl } = loadTsModule('src/ts/diagram/structurizr/parser.ts');
const { buildImpliedRelationships, resolveAllStructurizrViews } = loadTsModule('src/ts/diagram/structurizr/view-resolver.ts');
const { computeViewLayout } = loadTsModule('src/ts/diagram/structurizr/layout/layout-engine.ts');
const { ElkLayoutEngine } = loadTsModule('src/ts/diagram/structurizr/layout/elk-layout.ts');
const { renderStructurizrSvg } = loadTsModule('src/ts/diagram/structurizr/renderer/svg-renderer.ts');

async function runTests() {
  // 1. Info String 解析
  assert.strictEqual(parseStructurizrInfoString('mermaid'), null);
  assert.strictEqual(parseStructurizrInfoString(''), null);
  assert.deepStrictEqual(parseStructurizrInfoString('structurizr'), {
    lang: 'structurizr',
    initialViewKey: undefined
  });
  assert.deepStrictEqual(parseStructurizrInfoString('STRUCTURIZR-DSL view=Containers'), {
    lang: 'structurizr-dsl',
    initialViewKey: 'Containers'
  });
  assert.deepStrictEqual(parseStructurizrInfoString('structurizr view="System Context"'), {
    lang: 'structurizr',
    initialViewKey: 'System Context'
  });

  // 2. Lexer（コメント・HEX カラー・エスケープ・行番号）
  const lexTokens = tokenizeStructurizrDsl([
    '// line comment',
    '# hash comment',
    '/* multi',
    '   comment */',
    'background #1168bd',
    'name "Hello \\"World\\"\\nLine2"'
  ].join('\n'));
  const wordsAndStrings = lexTokens.filter(t => t.type === 'WORD' || t.type === 'STRING');
  assert.strictEqual(wordsAndStrings[0].value, 'background');
  assert.strictEqual(wordsAndStrings[0].line, 5);
  assert.strictEqual(wordsAndStrings[1].value, '#1168bd');
  assert.strictEqual(wordsAndStrings[3].value, 'Hello "World"\nLine2');

  assert.throws(
    () => tokenizeStructurizrDsl('workspace {\n  name "unclosed'),
    err => err.name === 'StructurizrSyntaxError' && err.line === 2
  );

  // 3. 2 パス Parser（前方参照・ブロック内省略関係・グループ・スタイル・未対応構文安全スキップ）
  const sampleDsl = `
workspace "E-Commerce" "オンラインストア構成" {
  !identifiers flat
  !include extra.dsl

  model {
    u = person "顧客" "商品を購入する利用者" {
      -> web "ブラウザで利用" "HTTPS"
    }

    group "社内基盤" {
      shop = softwareSystem "EC プラットフォーム" "注文と在庫を管理" {
        group "フロントエンド" {
          web = container "Web アプリ" "SPA フロントエンド" "TypeScript / React" "Web" {
            properties {
              tier "edge"
            }
          }
        }
        api = container "API サーバー" "業務 API" "Go" {
          orderCtrl = component "注文コントローラ" "注文受付" "HTTP Handler"
          invSvc = component "在庫サービス" "在庫引当" "Domain Service"
          orderCtrl -> invSvc "在庫確認"
        }
        db = container "データベース" "注文・商品データ" "PostgreSQL" {
          tags "Database"
        }
        web -> orderCtrl "API 呼び出し" "JSON/HTTPS"
        invSvc -> db "SQL 読み書き" "TCP"
      }
    }

    group "空グループ" {
      unused = softwareSystem "未使用システム"
    }

    mail = softwareSystem "外部メール基盤" "通知メール送信" "External"
    api -> mail "注文確認メール送信" "SMTP"

    deploymentEnvironment "Production" {
      deploymentNode "AWS" {
        containerInstance web
      }
    }
  }

  views {
    systemLandscape "Landscape" {
      include *
      exclude unused
      autoLayout tb 300 200
    }
    systemContext shop "Context" {
      include *
      autoLayout lr
    }
    container shop "Containers" {
      include *
      title "EC コンテナ構成"
      autoLayout tb
    }
    component api "Components" {
      include *
      autoLayout tb
    }
    dynamic shop "OrderFlow" {
      u -> web "注文する"
      autoLayout
    }
    theme https://static.structurizr.com/themes/default/theme.json
    styles {
      element "Database" {
        shape Cylinder
        background #2563EB
        color #FFFFFF
      }
      relationship "Relationship" {
        routing Orthogonal
        dashed true
      }
    }
  }
}
`;

  const ws = parseStructurizrDsl(sampleDsl);
  assert.strictEqual(ws.name, 'E-Commerce');
  assert.strictEqual(ws.views.length, 4);
  // 未対応構文が安全スキップされ警告収集されていること
  assert.ok(ws.warnings.some(w => w.code === 'UNSUPPORTED_DIRECTIVE' && w.message.includes('!include')));
  assert.ok(ws.warnings.some(w => w.code === 'UNSUPPORTED_SYNTAX' && w.message.includes('deploymentEnvironment')));
  assert.ok(ws.warnings.some(w => w.code === 'UNSUPPORTED_SYNTAX' && w.message.includes('dynamic')));
  assert.ok(ws.warnings.some(w => w.code === 'THEME_IGNORED'));
  assert.strictEqual(ws.styles.elements.length, 1);
  assert.strictEqual(ws.styles.elements[0].shape, 'Cylinder');

  // 4. 暗黙的関係（Implied Relationships）と 4 種ビュー解決
  const implied = buildImpliedRelationships(ws.elements, ws.relationships);
  const byIdentifier = {};
  for (const el of Object.values(ws.elements)) {
    if (el.identifier) byIdentifier[el.identifier] = el;
  }
  // u -> web から u -> shop への暗黙的関係が生成されること
  assert.ok(implied.some(r => r.sourceId === byIdentifier.u.id && r.destinationId === byIdentifier.shop.id));
  // web -> orderCtrl から web -> api への暗黙的関係が生成されること
  assert.ok(implied.some(r => r.sourceId === byIdentifier.web.id && r.destinationId === byIdentifier.api.id));
  // invSvc -> db から api -> db への暗黙的関係が生成されること
  assert.ok(implied.some(r => r.sourceId === byIdentifier.api.id && r.destinationId === byIdentifier.db.id));
  // shop -> mail への暗黙的関係が生成されること
  assert.ok(implied.some(r => r.sourceId === byIdentifier.shop.id && r.destinationId === byIdentifier.mail.id));
  // 親子・自己関係が暗黙生成されないこと
  assert.ok(!implied.some(r => r.sourceId === r.destinationId));
  assert.ok(!implied.some(r => r.sourceId === byIdentifier.shop.id && r.destinationId === byIdentifier.api.id));

  const resolvedViews = resolveAllStructurizrViews(ws);
  assert.strictEqual(resolvedViews.length, 4);

  const landscape = resolvedViews[0];
  assert.strictEqual(landscape.spec.key, 'Landscape');
  // unused は exclude されているため含まれず、空グループも生成されないこと
  assert.ok(!landscape.nodes.some(n => n.element.identifier === 'unused'));
  assert.ok(!landscape.boundaries.some(b => b.label === '空グループ'));
  assert.ok(landscape.boundaries.some(b => b.label === '社内基盤'));

  const contextView = resolvedViews[1];
  assert.strictEqual(contextView.spec.key, 'Context');
  const shopInContext = contextView.nodes.find(n => n.element.identifier === 'shop');
  assert.ok(shopInContext);
  assert.strictEqual(shopInContext.drillDownViewKey, 'Containers');
  assert.ok(contextView.edges.some(e => e.sourceId === byIdentifier.u.id && e.destinationId === byIdentifier.shop.id && e.implied));
  assert.ok(contextView.edges.some(e => e.sourceId === byIdentifier.shop.id && e.destinationId === byIdentifier.mail.id && e.implied));

  const containerView = resolvedViews[2];
  assert.strictEqual(containerView.title, 'EC コンテナ構成');
  assert.ok(containerView.boundaries.some(b => b.kind === 'scope' && b.label === 'EC プラットフォーム'));
  assert.ok(containerView.boundaries.some(b => b.kind === 'group' && b.label === 'フロントエンド'));
  const apiInContainer = containerView.nodes.find(n => n.element.identifier === 'api');
  assert.strictEqual(apiInContainer.drillDownViewKey, 'Components');

  const componentView = resolvedViews[3];
  assert.ok(componentView.nodes.some(n => n.element.identifier === 'orderCtrl'));
  assert.ok(componentView.nodes.some(n => n.element.identifier === 'invSvc'));
  // 外部関係を持つ同システム他コンテナ web / db が含まれること
  assert.ok(componentView.nodes.some(n => n.element.identifier === 'web' && n.external));
  assert.ok(componentView.nodes.some(n => n.element.identifier === 'db' && n.external));

  // 5. views 省略時の既定 systemLandscape 自動生成
  const minimalWs = parseStructurizrDsl(`
workspace {
  model {
    a = person "User"
    b = softwareSystem "App"
    a -> b "Uses"
  }
}
`);
  assert.strictEqual(minimalWs.views.length, 1);
  assert.strictEqual(minimalWs.views[0].kind, 'systemLandscape');

  // 6. 致命的構文エラー（波括弧不一致）が行番号付きで例外を投げること
  assert.throws(
    () => parseStructurizrDsl('workspace {\n  model {\n    u = person "User"\n'),
    err => err.name === 'StructurizrSyntaxError' && err.line >= 1
  );

  // 7. manualLayout パススルー検証（Phase 2 手動座標で ELK を呼ばないこと）
  const manualView = {
    ...contextView,
    spec: {
      ...contextView.spec,
      manualLayout: {
        source: 'manual',
        width: 800,
        height: 500,
        nodes: { [byIdentifier.shop.id]: { x: 100, y: 120, width: 220, height: 110 } },
        edges: {}
      }
    }
  };
  let elkCalled = false;
  const fakeAutoEngine = {
    async layout() {
      elkCalled = true;
      throw new Error('Should not be called');
    }
  };
  const manualResult = await computeViewLayout(manualView, ws.styles, fakeAutoEngine);
  assert.strictEqual(elkCalled, false);
  assert.strictEqual(manualResult.source, 'manual');
  assert.strictEqual(manualResult.nodes[byIdentifier.shop.id].x, 100);

  // 8. ELK.js 実機レイアウト + SVG レンダリング検証（全 4 ビュー）
  const elkEngine = new ElkLayoutEngine();
  for (const rv of resolvedViews) {
    const layout = await computeViewLayout(rv, ws.styles, elkEngine);
    assert.strictEqual(layout.source, 'auto');
    assert.ok(layout.width >= 240 && layout.height >= 140, `layout dimensions valid for ${rv.spec.key}`);
    for (const node of rv.nodes) {
      const rect = layout.nodes[node.element.id];
      assert.ok(rect && rect.width > 0 && rect.height > 0, `node rect exists for ${node.element.name}`);
    }
    for (const boundary of rv.boundaries) {
      const rect = layout.nodes[boundary.id];
      assert.ok(rect && rect.width > 0 && rect.height > 0, `boundary rect exists for ${boundary.label}`);
    }
    const svg = renderStructurizrSvg(rv, layout, ws.styles);
    assert.ok(svg.startsWith('<svg ') && svg.endsWith('</svg>'));
    assert.ok(svg.includes('class="layer-boundaries"'));
    assert.ok(svg.includes('class="layer-edges"'));
    assert.ok(svg.includes('class="layer-nodes"'));
    assert.ok(svg.includes(`data-c4-view-key="${rv.spec.key}"`));
  }

  // Container ビューの SVG にカスタムスタイル（#2563EB, Cylinder）とドリルダウンバッジが含まれること
  const containerLayout = await computeViewLayout(containerView, ws.styles, elkEngine);
  const containerSvg = renderStructurizrSvg(containerView, containerLayout, ws.styles);
  assert.ok(containerSvg.includes('#2563EB'));
  assert.ok(containerSvg.includes('data-drilldown-view="Components"'));

  console.log('PASS: structurizr-core.test.cjs (all assertions passed)');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
