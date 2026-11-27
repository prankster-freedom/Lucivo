/**
 * tools/resolve-affected-suites.cjs
 *
 * 変更されたファイル一覧と src/ts の静的 import 逆依存グラフから、
 * 実行すべき E2E テストスイートを算出する（Ref #336）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const TS_ROOT = path.join(ROOT_DIR, 'src', 'ts');
const MODES_DIR = path.join(ROOT_DIR, 'tests', 'e2e', 'modes');

const GATE_SUITES = ['testPresentModeGateWeb', 'testPresentModeGateStandalone'];

// 変更しても E2E を走らせないファイル（ドキュメントと同じ扱い）。check-ci-changes.cjs もこの一覧を使う
// - tools/build-color-tone-tables.cjs: カラートーンの文書（doc/0.DTP/assets/color-tones/）を書き出す道具で、配布物のビルドには使わない。
//   名前が tools/build-*.cjs に当たるが、全スイートの対象にしない。変更の確認は、tests/build-color-tone-tables.test.cjs（npm run lint の test:unit）で行う
const DOC_PATTERNS = [
  /^doc\//,
  /^\.claude\//,
  /^\.agent\//,
  /^\.github\/(?!workflows\/)/,
  /^[^/]+\.md$/,
  /^tools\/build-color-tone-tables\.cjs$/
];

// 変更時に全スイート実行（mode: 'all'）へ倒す安全対象
const FORCE_ALL_EXACT = new Set([
  'src/index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  '.github/workflows/e2e.yml',
  'tests/e2e/helpers.cjs',
  'tests/e2e.cjs',
  'src/ts/app.ts',
  'src/ts/ui/state.ts',
  'src/ts/ui/render-pipeline.ts',
  'src/ts/ui/fragment-renderer.ts',
  'src/css/tokens.css',
  'src/css/style.css'
]);

const FORCE_ALL_PATTERNS = [
  /^tools\/build-.*\.cjs$/
];

// エントリー・機能モジュールとスイートの直接マッピング
const DIRECT_SUITE_MAP = [
  {
    match: /^src\/ts\/ui\/present-modes\.ts$|^src\/ts\/modes\/modes\.json$|^tests\/e2e\/present-modes\.cjs$/,
    suites: () => [...getAllModeSuites(), ...GATE_SUITES]
  },
  {
    match: /^src\/ts\/stage\/|^src\/css\/visual-stage\.css$/,
    suites: () => ['testSignalLight', 'testStageShow', 'testStageOverviewPointer']
  },
  {
    match: /^src\/ts\/formatter\//,
    suites: () => ['testFormatter', 'testFileLoading', 'testUrlLoading']
  },
  {
    match: /^src\/ts\/emoji\/|^src\/ts\/markdown\/emoji\.ts$/,
    suites: () => ['testEmojiShortcodes']
  },
  {
    match: /^src\/ts\/math\/|^src\/ts\/markdown\/math-and-headings\.ts$/,
    suites: () => ['testMathRendering', 'testCoverAndTables']
  },
  {
    match: /^src\/ts\/markdown\/footnotes\.ts$/,
    suites: () => ['testFootnotes', 'testPerfOptimizations']
  },
  {
    match: /^src\/ts\/markdown\/tree\.ts$/,
    suites: () => ['testTree']
  },
  {
    match: /^src\/ts\/markdown\/local-images\.ts$/,
    suites: () => ['testLocalImages', 'testFolder', 'testSampleLinks']
  },
  {
    match: /^src\/ts\/markdown\/(?:syntax-highlight|block-renderers)\.ts$/,
    suites: () => ['testMarkdownTypography', 'testCoverAndTables', 'testCalloutsGlossaryPrint', 'testPerfOptimizations']
  },
  {
    match: /^src\/ts\/ui\/(?:folder-search|folder-browser)\.ts$/,
    suites: () => ['testFolder', 'testSampleLinks', 'testUrlLoading']
  },
  {
    match: /^src\/ts\/ui\/file-watch\.ts$/,
    suites: () => ['testAutoReload']
  },
  {
    match: /^src\/ts\/ui\/analytics\.ts$/,
    suites: () => ['testWebAnalytics']
  },
  {
    match: /^src\/ts\/ui\/url-loader\.ts$/,
    suites: () => ['testUrlLoading', 'testCoverAndTables']
  },
  {
    match: /^src\/ts\/ui\/editor-follow\.ts$/,
    suites: () => ['testEditFollow', 'testStartupAndCache', 'testPerfOptimizations']
  },
  {
    match: /^src\/ts\/diagram\/|^src\/css\/diagrams\.css$/,
    suites: () => [
      'testDiagramRendering',
      'testEdgeStyle',
      'testDiagramScaleModes',
      'testVisualStageQuality',
      'testSyntaxErrorCleanup',
      'testDiagramLongLabel',
      'testNodeLabelWrap',
      'testDiagramUserStyles',
      'testDiagramPanZoom',
      'testStructurizr'
    ]
  },
  {
    match: /^src\/ts\/ui\/(?:visual-stage|slab-export)\.ts$|^src\/css\/visual-.*\.css$|^src\/css\/print\.css$/,
    suites: () => ['testVisualStageQuality', 'testVisualTemplates', 'testVisualBaseline', 'testCoverAndTables', 'testCalloutsGlossaryPrint']
  }
];

const MAX_AFFECTED_MODULES = 10;

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function isDocFile(filePath) {
  return DOC_PATTERNS.some(re => re.test(filePath));
}

function extractSuiteNamesFromSource(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    const names = new Set();
    const suiteObjRe = /\{\s*name:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = suiteObjRe.exec(src)) !== null) {
      names.add(m[1]);
    }
    const fnRe = /async\s+function\s+(test[A-Za-z0-9_]+)\s*\(/g;
    while ((m = fnRe.exec(src)) !== null) {
      names.add(m[1]);
    }
    return Array.from(names);
  } catch {
    return [];
  }
}

function getModeSuitesById(modeId) {
  return extractSuiteNamesFromSource(path.join(MODES_DIR, `${modeId}.cjs`));
}

function getAllModeSuites() {
  if (!fs.existsSync(MODES_DIR)) return [];
  return fs.readdirSync(MODES_DIR)
    .filter(name => name.endsWith('.cjs'))
    .sort()
    .flatMap(name => getModeSuitesById(name.replace(/\.cjs$/, '')));
}

function getDirectSuitesForFile(filePath) {
  const norm = toPosix(filePath);

  const modeSrcMatch = norm.match(/^src\/ts\/modes\/([^/]+)\//);
  if (modeSrcMatch) {
    const modeSuites = getModeSuitesById(modeSrcMatch[1]);
    return [...modeSuites, ...GATE_SUITES];
  }

  const modeTestMatch = norm.match(/^tests\/e2e\/modes\/([^/]+)\.cjs$/);
  if (modeTestMatch) {
    const modeSuites = getModeSuitesById(modeTestMatch[1]);
    return [...modeSuites, ...GATE_SUITES];
  }

  const e2eFileMatch = norm.match(/^tests\/e2e\/([^/]+)\.cjs$/);
  if (e2eFileMatch) {
    const exported = extractSuiteNamesFromSource(path.join(ROOT_DIR, norm));
    if (exported.length > 0) return exported;
  }

  const matched = [];
  for (const entry of DIRECT_SUITE_MAP) {
    if (entry.match.test(norm)) {
      matched.push(...entry.suites());
    }
  }
  return matched;
}

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(full, out);
    } else if (ent.isFile() && ent.name.endsWith('.ts') && !ent.name.endsWith('.d.ts')) {
      out.push(toPosix(path.relative(ROOT_DIR, full)));
    }
  }
  return out;
}

function resolveImportTarget(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const fromDir = path.posix.dirname(fromFile);
  let target = path.posix.normalize(path.posix.join(fromDir, specifier));
  target = target.replace(/\.js$/, '');
  const candidates = [
    target,
    `${target}.ts`,
    `${target}/index.ts`
  ];
  for (const cand of candidates) {
    if (fs.existsSync(path.join(ROOT_DIR, cand)) && fs.statSync(path.join(ROOT_DIR, cand)).isFile()) {
      return cand;
    }
  }
  return null;
}

/**
 * src/ts 以下の静的 import から逆依存グラフ (module -> Set<importer>) を構築する。
 */
function buildReverseDependencyGraph() {
  const files = walkTsFiles(TS_ROOT);
  const importedBy = new Map();
  for (const f of files) {
    importedBy.set(f, new Set());
  }

  const importRe = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
    let m;
    importRe.lastIndex = 0;
    while ((m = importRe.exec(content)) !== null) {
      const target = resolveImportTarget(file, m[1]);
      if (target) {
        if (!importedBy.has(target)) importedBy.set(target, new Set());
        importedBy.get(target).add(file);
      }
    }
  }
  return importedBy;
}

function isForceAllFile(norm) {
  if (FORCE_ALL_EXACT.has(norm)) return true;
  return FORCE_ALL_PATTERNS.some(re => re.test(norm));
}

/**
 * 変更ファイル一覧から影響を受けるスイートを算出する。
 * @param {string[]} changedFiles
 * @param {Map<string, Set<string>>} [reverseGraph]
 * @returns {{ mode: 'all'|'partial', suites: string[], reason: string }}
 */
function resolveAffectedSuites(changedFiles, reverseGraph) {
  const graph = reverseGraph || buildReverseDependencyGraph();
  const nonDocFiles = changedFiles.map(toPosix).filter(f => f && !isDocFile(f));

  if (nonDocFiles.length === 0) {
    return { mode: 'all', suites: [], reason: 'no-code-files' };
  }

  for (const f of nonDocFiles) {
    if (isForceAllFile(f)) {
      return { mode: 'all', suites: [], reason: `force-all:${f}` };
    }
  }

  const selectedSuites = new Set();

  for (const file of nonDocFiles) {
    const direct = getDirectSuitesForFile(file);
    for (const s of direct) selectedSuites.add(s);

    const isTsModule = /^src\/ts\/.*\.ts$/.test(file);
    if (!isTsModule) {
      if (direct.length === 0) {
        return { mode: 'all', suites: [], reason: `unknown-file:${file}` };
      }
      continue;
    }

    // 逆依存グラフを BFS で辿り、到達したモジュールの直接マッピングも集める
    const visited = new Set([file]);
    const queue = [file];
    while (queue.length > 0) {
      const cur = queue.shift();
      const importers = graph.get(cur);
      if (!importers) continue;
      for (const imp of importers) {
        if (!visited.has(imp)) {
          visited.add(imp);
          if (visited.size >= MAX_AFFECTED_MODULES) {
            return { mode: 'all', suites: [], reason: `wide-impact:${file}` };
          }
          queue.push(imp);
        }
      }
    }

    let anyMappedInSubgraph = direct.length > 0;
    for (const mod of visited) {
      for (const s of getDirectSuitesForFile(mod)) {
        selectedSuites.add(s);
        anyMappedInSubgraph = true;
      }
    }

    if (!anyMappedInSubgraph) {
      return { mode: 'all', suites: [], reason: `unmapped-ts:${file}` };
    }
  }

  if (selectedSuites.size === 0) {
    return { mode: 'all', suites: [], reason: 'empty-selection' };
  }

  return {
    mode: 'partial',
    suites: Array.from(selectedSuites),
    reason: 'affected-suites-resolved'
  };
}

if (require.main === module) {
  const base = process.argv[2];
  const head = process.argv[3] || 'HEAD';
  if (!base) {
    console.error('Usage: node tools/resolve-affected-suites.cjs <base> [head]');
    process.exit(1);
  }
  const out = execSync(`git diff --name-only "${base}" "${head}"`, { encoding: 'utf8' });
  const files = out.split('\n').map(s => s.trim()).filter(Boolean);
  const result = resolveAffectedSuites(files);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  DOC_PATTERNS,
  DIRECT_SUITE_MAP,
  GATE_SUITES,
  MAX_AFFECTED_MODULES,
  buildReverseDependencyGraph,
  resolveAffectedSuites
};
