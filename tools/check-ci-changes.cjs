/**
 * tools/check-ci-changes.cjs
 * 
 * GitHub Actions (e2e.yml) で E2E テストを実行すべきか判定するスクリプト。
 * 
 * 判定ルール:
 * 1. PR 全体 (BASE..HEAD) の差分がすべてドキュメントまたは package.json/lock の版番号のみの場合 -> SKIP (e2e=false)
 * 2. 直前の push (BEFORE..HEAD) の増分差分がすべてドキュメントまたは版番号のみであり、
 *    かつ直前コミット (BEFORE) で test チェックが成功 (success) していた場合 -> SKIP (e2e=false)
 * 3. それ以外 (コード変更あり、直前テスト未完了/失敗、判定不能など) -> RUN (e2e=true)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

const DOC_PATTERNS = [
  /^doc\//,
  /^\.claude\//,
  /^\.agent\//,
  /^\.github\/(?!workflows\/)/,
  /^[^/]+\.md$/
];

function isDocPath(filePath) {
  return DOC_PATTERNS.some(re => re.test(filePath));
}

function isPackageVersionOnlyDiff(fromCommit, toCommit, filePath) {
  try {
    const diff = execSync(`git diff -U0 "${fromCommit}" "${toCommit}" -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const lines = diff
      .split('\n')
      .map(l => l.trim())
      .filter(l => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'));

    if (lines.length === 0) return true; // 差分なし
    return lines.every(l => /^[+-]\s*"version":\s*"[^"]+",?$/.test(l));
  } catch {
    return false;
  }
}

function areAllFilesDocsOrVersion(fromCommit, toCommit) {
  try {
    const output = execSync(`git diff --name-only "${fromCommit}" "${toCommit}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const files = output.split('\n').map(f => f.trim()).filter(Boolean);
    if (files.length === 0) return true;

    for (const file of files) {
      if (isDocPath(file)) continue;
      if (file === 'package.json' || file === 'package-lock.json') {
        if (isPackageVersionOnlyDiff(fromCommit, toCommit, file)) continue;
        return false;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function checkPreviousCommitTestSuccess(repo, commitSha, token) {
  if (!repo || !commitSha || !token) {
    return false;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${commitSha}/check-runs`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'lucivo-ci-changes-check'
      }
    });
    if (!res.ok) {
      console.warn(`check-runs API returned HTTP ${res.status}`);
      return false;
    }
    const data = await res.json();
    const checkRuns = data.check_runs || [];
    const testRun = checkRuns.find(r => r.name === 'test');
    if (!testRun) {
      console.log(`Previous commit ${commitSha.slice(0, 7)} has no 'test' check-run.`);
      return false;
    }
    const isSuccess = testRun.status === 'completed' && testRun.conclusion === 'success';
    console.log(`Previous commit ${commitSha.slice(0, 7)} 'test' status: ${testRun.status}, conclusion: ${testRun.conclusion}`);
    return isSuccess;
  } catch (err) {
    console.warn(`Failed to fetch check-runs: ${err.message}`);
    return false;
  }
}

async function evaluateE2E({ base, head, before, repo, token }) {
  if (!base || !head) {
    console.log('BASE or HEAD not specified. Defaulting to e2e=true');
    return { e2e: true, reason: 'missing-base-or-head' };
  }

  // 1. PR 全体の差分チェック (BASE..HEAD)
  console.log(`Checking overall PR changes (${base.slice(0, 7)}..${head.slice(0, 7)})...`);
  if (areAllFilesDocsOrVersion(base, head)) {
    return { e2e: false, reason: 'overall-docs-or-version-only' };
  }

  // 2. 増分差分チェック (BEFORE..HEAD)
  const isZeroSha = !before || /^0+$/.test(before);
  if (!isZeroSha && before !== head) {
    console.log(`Checking incremental changes (${before.slice(0, 7)}..${head.slice(0, 7)})...`);
    if (areAllFilesDocsOrVersion(before, head)) {
      console.log('Incremental changes are docs/version-only. Checking previous commit test result...');
      const prevSuccess = await checkPreviousCommitTestSuccess(repo, before, token);
      if (prevSuccess) {
        return { e2e: false, reason: 'incremental-docs-only-and-prev-test-passed' };
      } else {
        console.log('Previous commit test was not successful or not found. E2E test required.');
        return { e2e: true, reason: 'prev-test-not-successful' };
      }
    }
  }

  return { e2e: true, reason: 'code-changes-present' };
}

async function main() {
  const base = process.env.BASE || process.argv[2];
  const head = process.env.HEAD || process.env.GITHUB_SHA || process.argv[3] || 'HEAD';
  const before = process.env.BEFORE || process.argv[4] || '';
  const repo = process.env.GITHUB_REPOSITORY || process.argv[5] || '';
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

  const result = await evaluateE2E({ base, head, before, repo, token });
  console.log(`Result: e2e=${result.e2e} (${result.reason})`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `e2e=${result.e2e}\n`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Unexpected error in check-ci-changes:', err);
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'e2e=true\n');
    }
    process.exit(0); // 判定失敗時もワークフロー自体を落とさず安全側に倒す
  });
}

module.exports = {
  isDocPath,
  isPackageVersionOnlyDiff,
  areAllFilesDocsOrVersion,
  checkPreviousCommitTestSuccess,
  evaluateE2E
};
