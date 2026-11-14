const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { buildSamplesData } = require('./build-samples-data.cjs');
// 起動時の案内に表示し、更新の確認で比べる版（FR-049）。package.json の version を正とし、CI ビルド時は LUCIVO_VERSION_OVERRIDE で上書き可
const { version } = require('../package.json');
const appVersion = (process.env.LUCIVO_VERSION_OVERRIDE || '').trim() || version;

const isProd = process.argv.includes('--prod');
const ROOT_DIR = path.resolve(__dirname, '..');

// 配布先（doc/2.ARCHITECTURE.md 4.15）。web は public/ に出す（既定）。standalone は public/ を dist/ に写し、ビルドの出力だけを dist/ に上書きする
const channelIndex = process.argv.indexOf('--channel');
const channel = channelIndex === -1 ? 'web' : process.argv[channelIndex + 1];
if (channel !== 'web' && channel !== 'standalone') {
  console.error('Unknown channel: ' + channel + ' (use web or standalone)');
  process.exit(1);
}
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUT_DIR = channel === 'standalone' ? path.join(ROOT_DIR, 'dist') : PUBLIC_DIR;
// ビルドの出力（コミットしない。doc/2.ARCHITECTURE.md 4.14 ARC-PUB-001）の public/ からの相対パス（POSIX 区切り）。
// standalone は、これ以外のファイル（コミットするファイル）だけを public/ から写し、出力は dist/ にビルドで作る
const BUILD_OUTPUTS = ['js', 'css/style.css', 'css/modes', 'samples/samples-data.js'];

// 発表モードの登録表（doc/2.ARCHITECTURE.md 4.16 ARC-MODE-001）。配布先で絞る（ARC-MODE-002）:
// web は全部、standalone は stage: "all"（スタンドアロン版にも展開したもの）だけ。ビルドするモードも、本体に埋め込む表も、この絞った表で決める
const MODES_DIR = path.join(ROOT_DIR, 'src', 'ts', 'modes');
const ALL_MODES = require(path.join(MODES_DIR, 'modes.json'));
const MODES = ALL_MODES.filter(mode => channel === 'web' || mode.stage === 'all');

// 本体と同じく起動時に読む部品（光の演出）。Visualモードに初めて入ったときに読み込む
const STAGE_MODE_ENTRIES = [
  { entry: path.join(ROOT_DIR, 'src', 'js', 'stage.js'), outfile: path.join(OUT_DIR, 'js', 'stage.js') },
  // 発表モード（src/ts/modes/<id>/index.ts → js/modes/<id>.js）。追加・廃止は登録表の行とフォルダで決まる
  ...MODES.map(({ id }) => ({
    entry: path.join(MODES_DIR, id, 'index.ts'),
    outfile: path.join(OUT_DIR, 'js', 'modes', `${id}.js`)
  }))
];

// 必要なときだけ読み込む部品（起動時には読み込まない。NFR-006）
const LAZY_ENTRIES = [
  // Markdown の整形（FR-053, DD-FILE-088）。markdownlint を同梱する
  { entry: path.join(ROOT_DIR, 'src', 'ts', 'formatter', 'index.ts'), outfile: path.join(OUT_DIR, 'js', 'formatter.js') }
];

function copyPublicToStandalone() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.cpSync(PUBLIC_DIR, OUT_DIR, {
    recursive: true,
    filter: src => !BUILD_OUTPUTS.includes(path.relative(PUBLIC_DIR, src).split(path.sep).join('/'))
  });
}

// 廃止したモードの出力が残って紛れ込まないように、モードの出力のフォルダを書き込む前に空にする（ARC-PUB-006）
function cleanModeOutputs() {
  fs.rmSync(path.join(OUT_DIR, 'js', 'modes'), { recursive: true, force: true });
  fs.rmSync(path.join(OUT_DIR, 'css', 'modes'), { recursive: true, force: true });
}

async function build() {
  const start = Date.now();
  console.log(`Building app (${channel}, ${isProd ? 'production' : 'development'})...`);
  if (channel === 'standalone') copyPublicToStandalone();
  cleanModeOutputs();

  const commonJsOptions = {
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    sourcemap: !isProd ? 'inline' : false,
    minify: isProd,
    charset: 'utf8',
    legalComments: 'inline'
  };

  // Build main app + mode-specific stage scripts in parallel
  await Promise.all([
    esbuild.build({
      ...commonJsOptions,
      entryPoints: [path.join(ROOT_DIR, 'src', 'ts', 'app.ts')],
      outfile: path.join(OUT_DIR, 'js', 'app.js'),
      define: {
        __LUCIVO_VERSION__: JSON.stringify(appVersion),
        // この配布先で発表のドロップダウンに出すモード（stage は配布先で決まったあとは要らない）
        __LUCIVO_PRESENT_MODES__: JSON.stringify(MODES.map(({ id, label }) => ({ id, label })))
      }
    }),
    ...STAGE_MODE_ENTRIES.map(({ entry, outfile }) =>
      esbuild.build({
        ...commonJsOptions,
        entryPoints: [entry],
        outfile
      })
    ),
    ...LAZY_ENTRIES.map(({ entry, outfile }) =>
      esbuild.build({
        ...commonJsOptions,
        platform: 'browser',
        // 同梱するライブラリ（markdownlint の文字幅の判定など）は、ゼロ幅接合子などの見えない文字を
        // そのまま含む。出力では ASCII 以外をエスケープで書き、npm run lint の見えない文字の検査に合わせる
        charset: 'ascii',
        entryPoints: [entry],
        outfile
      })
    )
  ]);

  // Build CSS
  await esbuild.build({
    entryPoints: [path.join(ROOT_DIR, 'src', 'css', 'style.css')],
    outfile: path.join(OUT_DIR, 'css', 'style.css'),
    bundle: true,
    sourcemap: !isProd ? 'inline' : false,
    minify: isProd,
    charset: 'utf8',
    legalComments: 'inline'
  });

  // 発表モードの CSS（src/ts/modes/<id>/style.css → css/modes/<id>.css）。本体の CSS には含めず、モードを選んだときに読み込む
  await Promise.all(MODES.map(({ id }) =>
    esbuild.build({
      entryPoints: [path.join(MODES_DIR, id, 'style.css')],
      outfile: path.join(OUT_DIR, 'css', 'modes', `${id}.css`),
      bundle: true,
      sourcemap: !isProd ? 'inline' : false,
      minify: isProd,
      charset: 'utf8',
      legalComments: 'inline'
    })
  ));

  // file:// 直開き用の同梱サンプルのデータ（コミットしない出力）
  buildSamplesData(OUT_DIR);

  const duration = Date.now() - start;
  console.log(`App build completed in ${duration}ms.`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
