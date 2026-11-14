const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
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
// standalone に写さない public/ からの相対パス（POSIX 区切り）。当面は public/ と同じ中身にするため空（#115 で使う）
const STANDALONE_EXCLUDES = [];

// 発表モード別の独立ビルド対象（#58）。各モード（#61〜#63）は追加時にここへ足す
const STAGE_MODE_ENTRIES = [
  { entry: path.join(ROOT_DIR, 'src', 'js', 'stage.js'), outfile: path.join(OUT_DIR, 'js', 'stage.js') },
  // ズーミング・マップ（#61、FR-054）。Web 版だけで使う
  { entry: path.join(ROOT_DIR, 'src', 'ts', 'modes', 'zoom-map.ts'), outfile: path.join(OUT_DIR, 'js', 'zoom-map.js') },
  // プレイアブル・ダイアグラム（#62、FR-055）。Web 版だけで使う
  { entry: path.join(ROOT_DIR, 'src', 'ts', 'modes', 'playable.ts'), outfile: path.join(OUT_DIR, 'js', 'playable.js') }
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
    filter: src => !STANDALONE_EXCLUDES.includes(path.relative(PUBLIC_DIR, src).split(path.sep).join('/'))
  });
}

async function build() {
  const start = Date.now();
  console.log(`Building app (${channel}, ${isProd ? 'production' : 'development'})...`);
  if (channel === 'standalone') copyPublicToStandalone();

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
      define: { __LUCIVO_VERSION__: JSON.stringify(appVersion) }
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

  const duration = Date.now() - start;
  console.log(`App build completed in ${duration}ms.`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
