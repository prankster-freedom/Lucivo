const path = require('path');
const esbuild = require('esbuild');
// 起動時の案内に表示し、更新の確認で比べる版（FR-049）。package.json の version を正とする
const { version } = require('../package.json');

const isProd = process.argv.includes('--prod');
const ROOT_DIR = path.resolve(__dirname, '..');

async function build() {
  const start = Date.now();
  console.log(`Building app (${isProd ? 'production' : 'development'})...`);

  // Build JavaScript / TypeScript
  await esbuild.build({
    entryPoints: [path.join(ROOT_DIR, 'src', 'ts', 'app.ts')],
    outfile: path.join(ROOT_DIR, 'public', 'js', 'app.js'),
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    sourcemap: !isProd ? 'inline' : false,
    minify: isProd,
    charset: 'utf8',
    legalComments: 'inline',
    define: { __LUCIVO_VERSION__: JSON.stringify(version) }
  });

  // Build CSS
  await esbuild.build({
    entryPoints: [path.join(ROOT_DIR, 'src', 'css', 'style.css')],
    outfile: path.join(ROOT_DIR, 'public', 'css', 'style.css'),
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
