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

  // 9. Phase 2a: !identifiers hierarchical（同名別親・group 非修飾・相対/上位/ドット修飾参照・views 内参照・式フィルタ識別）
  const hierDsl = `
workspace "Hierarchical Identifiers" {
  !identifiers hierarchical

  model {
    u = person "User" "利用者"

    sysA = softwareSystem "System A" {
      group "Frontend" {
        wa = container "Web App" "UI" "TypeScript" {
          -> api "Calls" "HTTPS"
        }
      }
      api = container "API A" "Backend A" "Go" {
        ctrl = component "Order Controller" "Handles orders"
        ctrl -> db "Reads" "SQL"
      }
      db = container "DB A" "Database A" "PostgreSQL" {
        tags "Database"
      }
      wa -> db "Direct Read"
    }

    sysB = softwareSystem "System B" {
      api = container "API B" "Backend B" "Rust"
    }

    u -> sysA.wa "Uses" "HTTPS"
    sysA.api -> sysB.api "Syncs" "gRPC"
  }

  views {
    systemContext sysA "SysAContext" {
      include *
      autoLayout lr
    }
    container sysA "SysAContainers" {
      include u sysA.wa sysA.api sysA.db
      exclude sysA.db
      autoLayout lr
    }
    component sysA.api "SysAApiComponents" {
      include *
      autoLayout tb
    }
  }
}
`;
  const hierWs = parseStructurizrDsl(hierDsl);
  assert.strictEqual(hierWs.warnings.length, 0, `unexpected warnings: ${JSON.stringify(hierWs.warnings)}`);
  const hierById = {};
  for (const el of Object.values(hierWs.elements)) {
    if (el.identifier) hierById[el.identifier] = el;
  }
  // group は階層識別子に含まれないこと（sysA.wa であり sysA.Frontend.wa ではない）
  assert.ok(hierById['sysA.wa'], 'sysA.wa should exist');
  assert.ok(hierById['sysA.api'], 'sysA.api should exist');
  assert.ok(hierById['sysA.api.ctrl'], 'sysA.api.ctrl should exist');
  assert.ok(hierById['sysB.api'], 'sysB.api should exist without duplicate warning');
  // 関係がすべて解決されていること（wa->api, ctrl->db, wa->db, u->sysA.wa, sysA.api->sysB.api）
  assert.strictEqual(hierWs.relationships.length, 5);
  assert.ok(hierWs.relationships.some(r => r.sourceId === hierById.u.id && r.destinationId === hierById['sysA.wa'].id));
  assert.ok(hierWs.relationships.some(r => r.sourceId === hierById['sysA.api'].id && r.destinationId === hierById['sysB.api'].id));
  assert.ok(hierWs.relationships.some(r => r.sourceId === hierById['sysA.api.ctrl'].id && r.destinationId === hierById['sysA.db'].id));
  // views の scope / include / exclude がドット修飾識別子で解決されていること
  const hierResolved = resolveAllStructurizrViews(hierWs);
  assert.strictEqual(hierResolved.length, 3);
  const sysAContainers = hierResolved[1];
  assert.ok(sysAContainers.nodes.some(n => n.element.identifier === 'sysA.wa'));
  assert.ok(sysAContainers.nodes.some(n => n.element.identifier === 'sysA.api'));
  assert.ok(!sysAContainers.nodes.some(n => n.element.identifier === 'sysA.db'), 'sysA.db should be excluded');
  const sysAApiComp = hierResolved[2];
  assert.strictEqual(sysAApiComp.spec.scopeElementId, hierById['sysA.api'].id);
  assert.ok(sysAApiComp.nodes.some(n => n.element.identifier === 'sysA.api.ctrl'));

  // 式フィルタ（element.tag==...）と同ビューのドット修飾識別子が両方警告なしで受理されること
  const exprFilterWs = parseStructurizrDsl(`
workspace {
  !identifiers hierarchical
  model {
    ss = softwareSystem "S" {
      wa = container "W"
      api = container "API" {
        tags "Core"
      }
    }
  }
  views {
    container ss "C" {
      include element.tag==Core ss.wa
    }
  }
}
`);
  assert.strictEqual(exprFilterWs.warnings.length, 0);
  assert.strictEqual(exprFilterWs.views[0].includes.length, 2);
  const exprFilterResolved = resolveAllStructurizrViews(exprFilterWs)[0];
  assert.strictEqual(exprFilterResolved.nodes.length, 2);

  // 10. Phase 2a: !const / !constant / !var 定数・変数展開と未定義保持
  const constDsl = `
!const ORG "Acme"
!constant PLATFORM "\${ORG} Cloud"
!var ENV "Staging"

workspace "\${PLATFORM}" "Environment: \${ENV} / \${UNDEFINED_VAR}" {
  !const PRIMARY_COLOR #0f766e

  model {
    u = person "\${ORG} User"
    s = softwareSystem "\${PLATFORM}" {
      !var ENV "Production"
      web = container "Web (\${ENV})" "Frontend" "TypeScript"
    }
    u -> web "Accesses \${ENV}"
  }

  views {
    container s "Main" {
      include *
      title "\${PLATFORM} - \${ENV}"
      autoLayout lr
    }
    styles {
      element "Container" {
        background \${PRIMARY_COLOR}
        color #ffffff
      }
    }
  }
}
`;
  const constWs = parseStructurizrDsl(constDsl);
  assert.strictEqual(constWs.warnings.length, 0, `unexpected const warnings: ${JSON.stringify(constWs.warnings)}`);
  assert.strictEqual(constWs.name, 'Acme Cloud');
  assert.strictEqual(constWs.description, 'Environment: Staging / ${UNDEFINED_VAR}');
  const constWeb = Object.values(constWs.elements).find(e => e.identifier === 'web');
  assert.strictEqual(constWeb.name, 'Web (Production)');
  assert.strictEqual(constWs.views[0].title, 'Acme Cloud - Production');
  assert.strictEqual(constWs.styles.elements[0].background, '#0f766e');

  // !const 再定義は警告を出し元の値を維持すること
  const dupConstWs = parseStructurizrDsl(`
!const APP "First"
!const APP "Second"
workspace "\${APP}" {
  model {
    s = softwareSystem "\${APP}"
  }
}
`);
  assert.strictEqual(dupConstWs.name, 'First');
  assert.ok(dupConstWs.warnings.some(w => w.code === 'DUPLICATE_IDENTIFIER'));

  // 11. Phase 2a: 内蔵 default テーマプリセットと styles 上書き優先順位・外部 URL 混在時の警告
  const themeDsl = `
workspace "Theme Test" {
  model {
    u = person "User"
    s = softwareSystem "Core" {
      db = container "DB" "Data" "PostgreSQL" {
        tags "Database"
      }
    }
    u -> db "Uses"
  }
  views {
    container s "Containers" {
      include *
      autoLayout lr
    }
    styles {
      element "Database" {
        shape Cylinder
        background #dc2626
        color #ffffff
      }
    }
    theme default
  }
}
`;
  const themeWs = parseStructurizrDsl(themeDsl);
  assert.strictEqual(themeWs.warnings.length, 0, `unexpected theme warnings: ${JSON.stringify(themeWs.warnings)}`);
  // theme default が先、ワークスペース styles が後に並ぶこと（styles の記述が theme より前でも上書きが効く）
  assert.ok(themeWs.styles.elements.some(s => s.tag === 'Person' && s.background === '#08427b'));
  assert.strictEqual(themeWs.styles.elements[themeWs.styles.elements.length - 1].tag, 'Database');
  const themeResolved = resolveAllStructurizrViews(themeWs)[0];
  const themeLayout = await computeViewLayout(themeResolved, themeWs.styles, elkEngine);
  const themeSvg = renderStructurizrSvg(themeResolved, themeLayout, themeWs.styles);
  assert.ok(themeSvg.includes('#08427b'), 'default theme Person color applied');
  assert.ok(themeSvg.includes('#dc2626'), 'workspace styles overrides default theme');

  // themes で default と外部 URL を混在指定した場合は default を適用しつつ外部 URL のみ警告
  const mixedThemeWs = parseStructurizrDsl(`
workspace "Mixed Theme" {
  model {
    u = person "User"
  }
  views {
    themes default https://example.com/custom-theme.json
  }
}
`);
  assert.ok(mixedThemeWs.styles.elements.some(s => s.tag === 'Person' && s.background === '#08427b'));
  assert.strictEqual(mixedThemeWs.warnings.length, 1);
  assert.strictEqual(mixedThemeWs.warnings[0].code, 'THEME_IGNORED');

  // 12. Phase 2b: 要素式フィルタ（tag AND/!=, type, parent, technology, properties, group, && / ||, 引用符付き式）
  const elExprDsl = `
workspace "Expressions Test" {
  model {
    u = person "User" {
      tags "Tag 1"
    }
    s1 = softwareSystem "System 1" {
      group "Frontend" {
        web = container "Web" "" "TypeScript" {
          tags "Core,Tier 1"
          properties {
            owner "team-a"
          }
        }
      }
      api = container "API" "" "Go" {
        tags "Core"
        properties {
          owner "team-a"
        }
      }
      worker = container "Worker" "" "Go" {
        tags "Batch"
        properties {
          owner "team-b"
        }
      }
    }
    s2 = softwareSystem "System 2" {
      extApi = container "External API" "" "Go" {
        tags "Core"
      }
    }
    u -> web "Uses"
    web -> api "Calls"
    api -> worker "Queues"
    api -> extApi "Integrates"
  }
  views {
    container s1 "TagAnd" {
      include "element.tag==Core,Tier 1"
    }
    container s1 "TypeAndParent" {
      include "element.type==Container && element.parent==s1"
      exclude element.tag==Batch
    }
    container s1 "TechOrGroup" {
      include "element.technology==Go || element.group==Frontend"
    }
    container s1 "PropAndNotTag" {
      include element.properties[owner]==team-a
      exclude "element.tag!=Tier 1"
    }
    container s1 "MultiSystemContainers" {
      include element.parent==s1 element.parent==s2
    }
    container s1 "CouplingBoth" {
      include ->api->
    }
    container s1 "CouplingAfferent" {
      include element==->api
    }
    container s1 "CouplingExpr" {
      include ->element.tag==Batch
    }
  }
}
`;
  const elExprWs = parseStructurizrDsl(elExprDsl);
  assert.strictEqual(elExprWs.warnings.length, 0, `unexpected warnings: ${JSON.stringify(elExprWs.warnings)}`);
  const elExprViews = Object.fromEntries(resolveAllStructurizrViews(elExprWs).map(v => [v.spec.key, v]));

  assert.deepStrictEqual(elExprViews.TagAnd.nodes.map(n => n.element.identifier), ['web']);
  assert.deepStrictEqual(elExprViews.TypeAndParent.nodes.map(n => n.element.identifier), ['web', 'api']);
  assert.deepStrictEqual(elExprViews.TechOrGroup.nodes.map(n => n.element.identifier), ['web', 'api', 'worker', 'extApi']);
  assert.deepStrictEqual(elExprViews.PropAndNotTag.nodes.map(n => n.element.identifier), ['web']);
  assert.deepStrictEqual(elExprViews.MultiSystemContainers.nodes.map(n => n.element.identifier), ['web', 'api', 'worker', 'extApi']);
  // ->api-> は api + web(流入) + worker(流出) + 外部システム s2(流出・C4 抽象度準拠)
  assert.deepStrictEqual(elExprViews.CouplingBoth.nodes.map(n => n.element.identifier), ['web', 'api', 'worker', 's2']);
  // element==->api は api + web(流入)
  assert.deepStrictEqual(elExprViews.CouplingAfferent.nodes.map(n => n.element.identifier), ['web', 'api']);
  // ->element.tag==Batch は worker + api(流入)
  assert.deepStrictEqual(elExprViews.CouplingExpr.nodes.map(n => n.element.identifier), ['api', 'worker']);

  // 13. Phase 2b: 関係式フィルタと記述順の逐次評価
  const relExprDsl = `
workspace "Relationship Expressions" {
  model {
    a = softwareSystem "A"
    b = softwareSystem "B"
    c = softwareSystem "C" {
      tags "Internal"
    }
    a -> b "Sync Call" "HTTPS" "Sync" {
      properties {
        protocol "http2"
      }
    }
    a -> c "Async Event" "Kafka" "Async"
    b -> c "DB Sync" "TCP" "Sync"
  }
  views {
    systemLandscape "ExcludeAsync" {
      include *
      exclude relationship.tag==Async
    }
    systemLandscape "OnlySyncViaWildcard" {
      include *
      exclude *->*
      include relationship.tag==Sync
    }
    systemLandscape "ExcludeThenReinclude" {
      include *
      exclude element.tag==Internal
      include c
      exclude a->b
    }
    systemLandscape "RelPropAndSource" {
      include *
      exclude *->*
      include "relationship.source==a && relationship.properties[protocol]==http2"
    }
  }
}
`;
  const relExprWs = parseStructurizrDsl(relExprDsl);
  assert.strictEqual(relExprWs.warnings.length, 0, `unexpected warnings: ${JSON.stringify(relExprWs.warnings)}`);
  const relExprViews = Object.fromEntries(resolveAllStructurizrViews(relExprWs).map(v => [v.spec.key, v]));

  // ExcludeAsync: 全 3 要素が残り、Async エッジのみ除外（残り 2 本）
  assert.strictEqual(relExprViews.ExcludeAsync.nodes.length, 3);
  assert.strictEqual(relExprViews.ExcludeAsync.edges.length, 2);
  assert.ok(relExprViews.ExcludeAsync.edges.every(e => !e.tags.includes('Async')));

  // OnlySyncViaWildcard: *->* で全関係除外後、Sync のみ復活（2 本）
  assert.strictEqual(relExprViews.OnlySyncViaWildcard.nodes.length, 3);
  assert.strictEqual(relExprViews.OnlySyncViaWildcard.edges.length, 2);

  // ExcludeThenReinclude: c が復活し、a->b のみ除外（残り a->c, b->c の 2 本）
  assert.strictEqual(relExprViews.ExcludeThenReinclude.nodes.length, 3);
  assert.strictEqual(relExprViews.ExcludeThenReinclude.edges.length, 2);
  assert.ok(relExprViews.ExcludeThenReinclude.edges.every(e => e.description !== 'Sync Call'));

  // RelPropAndSource: a->b（protocol=http2）の 1 本のみ
  assert.strictEqual(relExprViews.RelPropAndSource.edges.length, 1);
  assert.strictEqual(relExprViews.RelPropAndSource.edges[0].description, 'Sync Call');

  // 14. Phase 2b: filtered ビュー（公式 Cookbook 準拠: OR タグ判定・ベースビュー非表示・境界再構築・未定義 baseKey 警告）
  const filteredDsl = `
workspace "Filtered Views" {
  model {
    group "Group A" {
      a = softwareSystem "A" {
        tags "Tag 1"
      }
    }
    group "Group B" {
      b = softwareSystem "B" {
        tags "Tag 2"
      }
    }
    c = softwareSystem "C" {
      tags "Tag 3"
    }
    a -> b "A to B"
    b -> c "B to C"
  }
  views {
    systemLandscape "landscape" {
      include *
      autoLayout lr
    }
    filtered "landscape" include "Tag 1,Tag 2,Relationship" "landscape1" {
      title "Tag 1 & 2 Only"
      default
    }
    filtered "landscape" exclude "Tag 1" "landscape2"
    filtered "missingBase" include "Tag 1" "broken"
  }
}
`;
  const filteredWs = parseStructurizrDsl(filteredDsl);
  assert.strictEqual(filteredWs.warnings.length, 1);
  assert.strictEqual(filteredWs.warnings[0].code, 'UNKNOWN_REFERENCE');
  // ベースビュー "landscape" は公式仕様どおり一覧から隠れ、landscape1 と landscape2 の 2 件が表示される
  const filteredResolved = resolveAllStructurizrViews(filteredWs);
  assert.deepStrictEqual(filteredResolved.map(v => v.spec.key), ['landscape1', 'landscape2']);

  const f1 = filteredResolved[0];
  assert.strictEqual(f1.title, 'Tag 1 & 2 Only');
  assert.strictEqual(f1.spec.isDefault, true);
  assert.strictEqual(f1.spec.autoLayout.direction, 'lr');
  assert.deepStrictEqual(f1.nodes.map(n => n.element.identifier), ['a', 'b']);
  assert.strictEqual(f1.edges.length, 1);
  assert.strictEqual(f1.edges[0].description, 'A to B');
  assert.strictEqual(f1.boundaries.length, 2);

  const f2 = filteredResolved[1];
  assert.deepStrictEqual(f2.nodes.map(n => n.element.identifier), ['b', 'c']);
  assert.strictEqual(f2.edges.length, 1);
  assert.strictEqual(f2.edges[0].description, 'B to C');
  // Group A はノードが除外されたため境界も消えていること
  assert.deepStrictEqual(f2.boundaries.map(b => b.label), ['Group B']);

  console.log('PASS: structurizr-core.test.cjs (all assertions passed)');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
