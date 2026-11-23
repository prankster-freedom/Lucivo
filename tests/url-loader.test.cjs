/**
 * tests/url-loader.test.cjs
 *
 * src/ts/ui/url-loader.ts の単体テスト（FR-050, DD-FILE-087, #370）。
 * 実行: node tests/url-loader.test.cjs
 */
'use strict';

const assert = require('assert');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');

function loadUrlLoader() {
  const result = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src/ts/ui/url-loader.ts')],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node'
  });
  const mod = { exports: {} };
  const fn = new Function('require', 'module', 'exports', result.outputFiles[0].text);
  fn(require, mod, mod.exports);
  return mod.exports;
}

async function run() {
  const {
    parseGitHubTreeUrl,
    matchLongestBranchRef,
    resolveGitHubTreeSpec,
    makeGitHubRawUrl
  } = loadUrlLoader();

  // 1. matchLongestBranchRef: 最長一致・'/' 境目の誤一致防止・ルート指定
  assert.deepStrictEqual(
    matchLongestBranchRef(
      ['feature', 'Gemini-color-tones-review', 'doc', '0.DTP'],
      [
        'refs/heads/feature',
        'refs/heads/feature/Gemini',
        'refs/heads/feature/Gemini-color-tones-review',
        'refs/heads/feature/Gemini-color-tones-review-extra'
      ]
    ),
    { ref: 'feature/Gemini-color-tones-review', basePath: 'doc/0.DTP' },
    'スラッシュ入りブランチ名の最長一致かつ "/" 境目でのみ一致すること'
  );

  assert.deepStrictEqual(
    matchLongestBranchRef(
      ['feature', 'foo'],
      ['refs/heads/feature/foo']
    ),
    { ref: 'feature/foo', basePath: '' },
    'ブランチ直下（basePath 空）も一致すること'
  );

  assert.strictEqual(
    matchLongestBranchRef(
      ['feature', 'foobar', 'doc'],
      ['refs/heads/feature/foo']
    ),
    null,
    '部分文字列の誤一致（feature/foo が feature/foobar に当たらない）を防ぐこと'
  );

  // 2. makeGitHubRawUrl: スラッシュ入り ref のセグメント単位エンコード
  assert.strictEqual(
    makeGitHubRawUrl('owner', 'repo', 'feature/Gemini-color-tones', 'doc/README.md'),
    'https://raw.githubusercontent.com/owner/repo/feature/Gemini-color-tones/doc/README.md',
    'makeGitHubRawUrl がスラッシュ入りブランチ名を正しく組み立てること'
  );

  // 3. resolveGitHubTreeSpec: 1 セグメントのみ（/tree/main）では matching-refs を呼ばない
  let called = 0;
  const rootSpec = await resolveGitHubTreeSpec(
    new URL('https://github.com/prankster-freedom/Lucivo/tree/main'),
    async () => { called++; return { ok: true, status: 200, json: async () => [] }; }
  );
  assert.strictEqual(called, 0, '/tree/<single> では不要な API 呼び出しを行わないこと');
  assert.deepStrictEqual(rootSpec, { owner: 'prankster-freedom', repo: 'Lucivo', ref: 'main', basePath: '' });

  // 4. resolveGitHubTreeSpec: matching-refs でスラッシュ入りブランチ名を解決
  const requestedUrls = [];
  const resolved = await resolveGitHubTreeSpec(
    new URL('https://github.com/prankster-freedom/Lucivo/tree/feature/Gemini-color-tones-review/doc/0.DTP/assets/color-tones'),
    async u => {
      requestedUrls.push(u);
      return {
        ok: true,
        status: 200,
        json: async () => [
          { ref: 'refs/heads/feature/pre-test' },
          { ref: 'refs/heads/feature/Gemini-color-tones-review' }
        ]
      };
    }
  );
  assert.strictEqual(requestedUrls.length, 1);
  assert.ok(requestedUrls[0].includes('/git/matching-refs/heads/feature?per_page=100&page=1'));
  assert.deepStrictEqual(resolved, {
    owner: 'prankster-freedom',
    repo: 'Lucivo',
    ref: 'feature/Gemini-color-tones-review',
    basePath: 'doc/0.DTP/assets/color-tones'
  });

  // 5. resolveGitHubTreeSpec: 複数ページネーションと上限（maxPages=3）
  const pagedCalls = [];
  const paged = await resolveGitHubTreeSpec(
    new URL('https://github.com/o/r/tree/feature/deep/branch/sub'),
    async u => {
      pagedCalls.push(u);
      const page = Number(new URL(u).searchParams.get('page'));
      if (page === 1) {
        return { ok: true, status: 200, json: async () => Array.from({ length: 100 }, (_, i) => ({ ref: `refs/heads/feature/b-${i}` })) };
      }
      return { ok: true, status: 200, json: async () => [{ ref: 'refs/heads/feature/deep/branch' }] };
    },
    5000,
    3
  );
  assert.strictEqual(pagedCalls.length, 2, '2 ページ目で 100 件未満になったら終了すること');
  assert.deepStrictEqual(paged, { owner: 'o', repo: 'r', ref: 'feature/deep/branch', basePath: 'sub' });

  // 6. resolveGitHubTreeSpec: タグやコミット SHA（一致なし）・404 失敗時は parseGitHubTreeUrl の既定解釈へフォールバック
  const fallbackSpec = await resolveGitHubTreeSpec(
    new URL('https://github.com/o/r/tree/abc1234/docs/guide'),
    async () => ({ ok: true, status: 200, json: async () => [] })
  );
  assert.deepStrictEqual(fallbackSpec, parseGitHubTreeUrl(new URL('https://github.com/o/r/tree/abc1234/docs/guide')));

  const errFallback = await resolveGitHubTreeSpec(
    new URL('https://github.com/o/r/tree/v1.0.0/docs'),
    async () => ({ ok: false, status: 404, json: async () => ({}) })
  );
  assert.deepStrictEqual(errFallback, { owner: 'o', repo: 'r', ref: 'v1.0.0', basePath: 'docs' });

  // 7. resolveGitHubTreeSpec: 403 / 429 レート制限時は GITHUB_RATE_LIMIT を送出
  await assert.rejects(
    () => resolveGitHubTreeSpec(
      new URL('https://github.com/o/r/tree/feature/x/docs'),
      async () => ({ ok: false, status: 403, json: async () => ({}) })
    ),
    /GITHUB_RATE_LIMIT/,
    'HTTP 403 時は GITHUB_RATE_LIMIT エラーを送出すること'
  );

  console.log('url-loader.test.cjs: all assertions passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
