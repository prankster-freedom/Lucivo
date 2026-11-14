// Lucivo のブラウザ動作確認スクリプト（テスト仕様: doc/4.test_spec/）
// 使い方: node tests/e2e.cjs [スイート名またはTC-ID...]
// 出力: work/test/（結果 JSON と図の画像。git 管理外）
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { OUT_DIR, SHOT_DIR, results, record } = require('./e2e/helpers.cjs');

const {
  testFileLoading,
  testUrlLoading,
  testTitleAndDrop,
  testLocalImages,
  testFolder,
  testSampleLinks,
  testEncoding
} = require('./e2e/file-loading.cjs');

const {
  testDiagramRendering,
  testEdgeStyle,
  testEditFollow,
  testSyntaxErrorCleanup,
  testDiagramLongLabel,
  testDiagramUserStyles,
  testStyleBar,
  testDiagramPanZoom
} = require('./e2e/diagrams.cjs');

const {
  testMarkdownTypography,
  testMathRendering,
  testFrontMatter,
  testTree,
  testFormatter
} = require('./e2e/markdown-math.cjs');

const {
  testVisualStageQuality,
  testVisualTemplates,
  testCoverAndTables,
  testCalloutsGlossaryPrint
} = require('./e2e/visual-stage.cjs');

const {
  testSignalLight,
  testStageShow,
  testStageOverviewPointer
} = require('./e2e/stage-show.cjs');

const {
  testStartupAndCache,
  testResponsiveAndWebUi,
  testOffline,
  testZoomMap,
  testPlayable
} = require('./e2e/modes-and-ui.cjs');

// スイートの既定の上限。止まったスイートを打ち切るためのもので、正常な実行の所要時間より十分に長くする
const SUITE_TIMEOUT_MS = 90000;
const SUITES = [
  { name: 'testFileLoading', tcPrefix: ['TC-FILE-001', 'TC-FILE-002', 'TC-FILE-003', 'TC-FILE-004', 'TC-FILE-005', 'TC-FILE-006', 'TC-FILE-007', 'TC-FILE-008', 'TC-FILE-011', 'TC-FILE-012', 'TC-FILE-013', 'TC-FILE-014', 'TC-FILE-015', 'TC-FILE-034'], fn: testFileLoading },
  { name: 'testUrlLoading', tcPrefix: ['TC-FILE-035'], fn: testUrlLoading },
  { name: 'testTitleAndDrop', tcPrefix: ['TC-FILE-017', 'TC-FILE-018', 'TC-FILE-019', 'TC-FILE-032', 'TC-FILE-033'], fn: testTitleAndDrop },
  { name: 'testSampleLinks', tcPrefix: ['TC-FILE-028'], fn: testSampleLinks },
  { name: 'testEncoding', tcPrefix: ['TC-FILE-029', 'TC-FILE-030', 'TC-FILE-031'], fn: testEncoding },
  { name: 'testFormatter', tcPrefix: ['TC-FILE-036', 'TC-FILE-037', 'TC-FILE-038', 'TC-FILE-039', 'TC-FILE-040'], fn: testFormatter },
  { name: 'testZoomMap', tcPrefix: ['TC-SHOW-015', 'TC-SHOW-016', 'TC-SHOW-017', 'TC-SHOW-018', 'TC-SHOW-019'], fn: testZoomMap, timeoutMs: 150000 },
  { name: 'testPlayable', tcPrefix: ['TC-SHOW-020', 'TC-SHOW-021', 'TC-SHOW-022', 'TC-SHOW-023', 'TC-SHOW-024'], fn: testPlayable },
  { name: 'testFolder', tcPrefix:['TC-FILE-021', 'TC-FILE-022', 'TC-FILE-023', 'TC-FILE-024', 'TC-FILE-025', 'TC-FILE-027'], fn: testFolder },
  // 10 モード × 全図のスクリーンショット（TC-DIAG-005）を撮るため、ローカルで約 90 秒かかる。CI の揺らぎを見込んで既定より長くする
  { name: 'testDiagramRendering', tcPrefix: ['TC-DIAG-'], fn: testDiagramRendering, timeoutMs: 240000 },
  { name: 'testMarkdownTypography', tcPrefix: ['TC-MD-001', 'TC-MD-002', 'TC-MD-003', 'TC-MD-004', 'TC-MD-005', 'TC-MD-006', 'TC-MD-007', 'TC-MD-008', 'TC-MD-009', 'TC-MD-010', 'TC-MD-011'], fn: testMarkdownTypography },
  { name: 'testLocalImages', tcPrefix: ['TC-MD-013', 'TC-MD-014', 'TC-MD-015'], fn: testLocalImages },
  { name: 'testTree', tcPrefix: ['TC-MD-017', 'TC-MD-018', 'TC-MD-019'], fn: testTree },
  { name: 'testMathRendering', tcPrefix: ['TC-MATH-'], fn: testMathRendering },
  { name: 'testFrontMatter', tcPrefix: ['TC-FM-'], fn: testFrontMatter },
  { name: 'testEdgeStyle', tcPrefix: ['TC-EDGE-'], fn: testEdgeStyle },
  { name: 'testVisualStageQuality', tcPrefix: ['TC-STAGE-'], fn: testVisualStageQuality },
  { name: 'testVisualTemplates', tcPrefix: ['TC-VTPL-001', 'TC-VTPL-002', 'TC-VTPL-003', 'TC-VTPL-004', 'TC-VTPL-005', 'TC-VTPL-006', 'TC-VTPL-007', 'TC-VTPL-008', 'TC-VTPL-009', 'TC-VTPL-010', 'TC-VTPL-011', 'TC-VTPL-012', 'TC-VTPL-013', 'TC-VTPL-014'], fn: testVisualTemplates, timeoutMs: 150000 },
  { name: 'testCoverAndTables', tcPrefix: ['TC-VTPL-015', 'TC-VTPL-016', 'TC-VTPL-018', 'TC-VTPL-019', 'TC-VTPL-020', 'TC-VTPL-024'], fn: testCoverAndTables },
  { name: 'testSignalLight', tcPrefix: ['TC-LIGHT-'], fn: testSignalLight },
  { name: 'testStageShow', tcPrefix: ['TC-SHOW-001', 'TC-SHOW-002', 'TC-SHOW-003', 'TC-SHOW-004', 'TC-SHOW-005', 'TC-SHOW-006', 'TC-SHOW-007'], fn: testStageShow, timeoutMs: 180000 },
  { name: 'testStageOverviewPointer', tcPrefix: ['TC-SHOW-008', 'TC-SHOW-009', 'TC-SHOW-010', 'TC-SHOW-011', 'TC-SHOW-012', 'TC-SHOW-013', 'TC-SHOW-014'], fn: testStageOverviewPointer },
  { name: 'testCalloutsGlossaryPrint', tcPrefix: ['TC-MD-012', 'TC-VTPL-021', 'TC-VTPL-022'], fn: testCalloutsGlossaryPrint },
  { name: 'testEditFollow', tcPrefix: ['TC-DIAG-022', 'TC-DIAG-023'], fn: testEditFollow },
  { name: 'testStyleBar', tcPrefix: ['TC-DIAG-024'], fn: testStyleBar },
  { name: 'testSyntaxErrorCleanup', tcPrefix: ['TC-DIAG-025'], fn: testSyntaxErrorCleanup },
  { name: 'testDiagramLongLabel', tcPrefix: ['TC-DIAG-029'], fn: testDiagramLongLabel },
  { name: 'testDiagramUserStyles', tcPrefix: ['TC-DIAG-030'], fn: testDiagramUserStyles },
  { name: 'testDiagramPanZoom', tcPrefix: ['TC-DIAG-026', 'TC-DIAG-027', 'TC-DIAG-028'], fn: testDiagramPanZoom },
  { name: 'testStartupAndCache', tcPrefix: ['TC-CACHE-'], fn: testStartupAndCache },
  { name: 'testResponsiveAndWebUi', tcPrefix: ['TC-UI-'], fn: testResponsiveAndWebUi },
  { name: 'testOffline', tcPrefix: ['TC-OFF-'], fn: testOffline }
];

function runWithTimeout(fn, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Suite timeout (${ms}ms): ${label}`)), ms);
    Promise.resolve(fn()).then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

(async () => {
  const filters = process.argv.slice(2).map(s => s.toLowerCase());
  const selected = filters.length === 0
    ? SUITES
    : SUITES.filter(s => filters.some(f =>
      s.name.toLowerCase().includes(f) ||
      s.tcPrefix.some(p => p.toLowerCase().includes(f) || f.startsWith(p.toLowerCase()))
    ));
  if (selected.length === 0) {
    console.error(`No test suite matched filter: ${process.argv.slice(2).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    // 1 つのスイートが例外・タイムアウトで止まっても、残りのスイートは実行する（失敗が後続のテストの結果を隠さないようにする）
    for (const suite of selected) {
      const startedAt = Date.now();
      try {
        await runWithTimeout(() => suite.fn(browser), suite.timeoutMs || SUITE_TIMEOUT_MS, suite.name);
      } catch (e) {
        record(`RUNTIME ${suite.name}`, false, e.stack);
      }
      // 上限（timeoutMs）を見直すための所要時間
      console.log(`SUITE ${suite.name} ${((Date.now() - startedAt) / 1000).toFixed(1)}s / ${((suite.timeoutMs || SUITE_TIMEOUT_MS) / 1000).toFixed(0)}s`);
    }
  } finally {
    await browser.close();
  }
  const resultsPath = path.join(OUT_DIR, 'results.json');
  let mergedResults = results;
  if (filters.length > 0 && fs.existsSync(resultsPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      if (Array.isArray(prev)) {
        const updatedMap = new Map(results.map(r => [r.id, r]));
        mergedResults = prev.map(r => updatedMap.has(r.id) ? updatedMap.get(r.id) : r);
        const existingIds = new Set(prev.map(r => r.id));
        for (const r of results) {
          if (!existingIds.has(r.id)) mergedResults.push(r);
        }
      }
    } catch (_) {
      // 前回の結果が壊れていて読めないときは、今回の結果だけを書き出す
    }
  }
  fs.writeFileSync(resultsPath, JSON.stringify(mergedResults, null, 2));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
})();
