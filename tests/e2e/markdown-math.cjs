const path = require('path');
const fs = require('fs');
const {
  ROOT_DIR,
  APP_DIR,
  APP_URL,
  SAMPLE,
  OUT_DIR,
  SHOT_DIR,
  VISUAL_STYLES,
  MODES,
  SHOWCASE_SCENES,
  sceneCount,
  record,
  openApp,
  waitRendered,
  formattedForLoad,
  loadSample,
  selectVisualStyle,
  setMode,
  openStagePage,
  setDocument,
  scrollToSlab,
  seekLight
} = require('./helpers.cjs');

function inspectMarkdown(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  const q = sel => root.querySelector(sel);
  const cs = el => getComputedStyle(el);
  const isTransparent = c => c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  // 要素の背後にある最も近い不透明な背景色
  const backdrop = el => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const bg = cs(n).backgroundColor;
      if (!isTransparent(bg)) return bg;
    }
    return 'rgb(255, 255, 255)';
  };
  const px = v => parseFloat(v);
  // Visual Stage の段落・リストは、雛形（FR-016）を適用しない標準型の章で調べる（雛形の章は見た目を変えるため）
  const std = isVisual ? '.vs-tpl-standard ' : '';
  const body = q(`${std}h4 ~ p`);
  const h3 = q('h3'), h4 = q('h4');
  const uls = [q(`${std}ul`), q(`${std}ul ul`), q(`${std}ul ul ul`)];
  const ol = q(`${std}ol`);
  const task = Array.from(root.querySelectorAll(`${std}li`)).find(li => li.querySelector(':scope > input[type="checkbox"]'));
  const link = q('a');
  const inline = Array.from(root.querySelectorAll('code')).find(c => !c.closest('pre'));
  const pre = q('pre'), preCode = q('pre code');
  const bq = q('blockquote'), bqInner = q('blockquote blockquote');
  const table = q('table');
  const cells = table ? [2, 3].map(n => ({ th: table.querySelector(`th:nth-child(${n})`), td: table.querySelector(`td:nth-child(${n})`) })) : [];
  const hr = q('hr');
  const details = q('details'), summary = q('summary'), kbd = q('kbd'), mark = q('mark'), sub = q('sub'), sup = q('sup');
  return {
    heading: !!(h3 && h4 && body) && (() => {
      const b = cs(body), a = cs(h3), c = cs(h4);
      const stands = s => px(s.fontSize) > px(b.fontSize) || +s.fontWeight >= +b.fontWeight + 200;
      return { ok: stands(a) && stands(c) && px(a.fontSize) > px(c.fontSize), h3: [a.fontSize, a.fontWeight], h4: [c.fontSize, c.fontWeight], p: [b.fontSize, b.fontWeight] };
    })(),
    list: (() => {
      const types = uls.map(u => u && cs(u).listStyleType);
      const li = [q(`${std}ul > li`), q(`${std}ul ul > li`), q(`${std}ul ul ul > li`)];
      const indented = li.every(Boolean) && li[0].getBoundingClientRect().left < li[1].getBoundingClientRect().left && li[1].getBoundingClientRect().left < li[2].getBoundingClientRect().left;
      const olType = ol && cs(ol).listStyleType;
      const taskType = task && cs(task).listStyleType;
      return { ok: types.join() === 'disc,circle,square' && olType === 'decimal' && indented && taskType === 'none', types, olType, indented, taskType };
    })(),
    link: link && (() => {
      const s = cs(link);
      return { ok: s.color !== cs(body).color && /underline/.test(s.textDecorationLine), color: s.color, p: cs(body).color, deco: s.textDecorationLine };
    })(),
    code: inline && pre && preCode && (() => {
      const i = cs(inline), p = cs(pre), pc = cs(preCode);
      const mono = s => /JetBrains Mono|monospace/.test(s.fontFamily);
      const ok = mono(i) && mono(pc) && !isTransparent(i.backgroundColor) && i.backgroundColor !== backdrop(inline)
        && !isTransparent(p.backgroundColor) && p.backgroundColor !== backdrop(pre)
        && isTransparent(pc.backgroundColor) && px(pc.borderTopWidth) === 0;
      return { ok, inlineBg: i.backgroundColor, inlineBackdrop: backdrop(inline), preBg: p.backgroundColor, preBackdrop: backdrop(pre), preCodeBg: pc.backgroundColor };
    })(),
    blockquote: bq && bqInner && (() => {
      const s = cs(bq);
      const ok = px(s.borderLeftWidth) >= 3 && s.borderLeftColor !== backdrop(bq) && px(s.paddingLeft) > 0 && isTransparent(s.backgroundColor)
        && bqInner.getBoundingClientRect().left > bq.getBoundingClientRect().left && px(cs(bqInner).borderLeftWidth) >= 3;
      return { ok, border: [s.borderLeftWidth, s.borderLeftColor], backdrop: backdrop(bq), bg: s.backgroundColor };
    })(),
    table: cells.length === 2 && (() => {
      const aligns = cells.map(c => [cs(c.th).textAlign, cs(c.td).textAlign]);
      return { ok: aligns[0].every(a => a === 'center') && aligns[1].every(a => a === 'right'), aligns };
    })(),
    hr: hr && (() => {
      const s = cs(hr);
      return { ok: px(s.borderTopWidth) >= 1 && s.borderTopStyle !== 'none' && s.borderTopColor !== backdrop(hr), color: s.borderTopColor, backdrop: backdrop(hr) };
    })(),
    html: (() => {
      const present = { details: !!details, summary: !!summary, kbd: !!kbd, mark: !!mark, sub: !!sub, sup: !!sup };
      if (!Object.values(present).every(Boolean)) return { ok: false, present };
      const framed = el => px(cs(el).borderTopWidth) >= 1 && cs(el).borderTopColor !== backdrop(el);
      const m = cs(mark);
      const small = el => px(cs(el).fontSize) < px(cs(el.parentElement).fontSize);
      const ok = framed(details) && framed(kbd) && !isTransparent(m.backgroundColor) && m.backgroundColor !== backdrop(mark) && small(sub) && small(sup);
      return { ok, details: cs(details).borderTopColor, kbd: cs(kbd).borderTopColor, mark: m.backgroundColor };
    })(),
    // 1〜7 章（最初の図の手前まで）の撮影範囲
    clip: (() => {
      const top = root.getBoundingClientRect().top + window.scrollY;
      const frame = root.querySelector('[id^="diagram-frame-"]');
      const end = isVisual ? frame.closest('.exhibition-slab') : frame;
      const r = root.getBoundingClientRect();
      return { x: r.left, y: top, width: r.width, height: end.getBoundingClientRect().top + window.scrollY - top };
    })()
  };
}

async function testMarkdownTypography(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  const checks = { heading: 'TC-MD-001', list: 'TC-MD-002', link: 'TC-MD-003', code: 'TC-MD-004', blockquote: 'TC-MD-005', table: 'TC-MD-006', hr: 'TC-MD-007', html: 'TC-MD-008' };
  const byTc = {};
  for (const mode of MD_MODES) {
    await setMode(page, mode);
    const isVisual = mode.style !== 'std';
    const res = await page.evaluate(inspectMarkdown, isVisual);
    const tag = `${mode.style}-${mode.appearance}`;
    for (const [key, tc] of Object.entries(checks)) {
      (byTc[tc] = byTc[tc] || []).push({ mode: tag, ok: !!(res[key] && res[key].ok), detail: res[key] });
    }
    await page.screenshot({ path: path.join(SHOT_DIR, `md-${tag}.png`), clip: res.clip });
  }
  for (const [tc, rows] of Object.entries(byTc)) {
    const failed = rows.filter(r => !r.ok);
    record(tc, failed.length === 0, failed.length ? JSON.stringify(failed) : `${rows.length} モード`);
  }
  // TC-MD-009 サンプルの HTML の例に独自の class がない
  const sample = fs.readFileSync(SAMPLE, 'utf8').replace(/```[\s\S]*?```/g, '');
  record('TC-MD-009', !/<[a-z][^>]*\sclass=/i.test(sample), '');
  // TC-MD-011 発展サンプル（notation_sample_extra1.md）の存在と HTML に独自 class がないこと
  const EXTRA_SAMPLE = path.join(APP_DIR, 'samples', 'notation_sample_extra1.md');
  const hasExtra = fs.existsSync(EXTRA_SAMPLE);
  const extraContent = hasExtra ? fs.readFileSync(EXTRA_SAMPLE, 'utf8').replace(/```[\s\S]*?```/g, '') : '';
  record('TC-MD-011', hasExtra && !/<[a-z][^>]*\sclass=/i.test(extraContent), `extra sample exists: ${hasExtra}`);
  if (page.consoleErrors.length) record('TC-MD-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

// 本文の数式（samples/notation_sample.md の 8 章）を調べる
function inspectMath(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  const all = Array.from(root.querySelectorAll('.lucivo-math'));
  const section = Array.from(root.querySelectorAll('h2')).find(h => /数式/.test(h.textContent) && !/図の中/.test(h.textContent));
  // 8 章の段落（見出しの次の要素から、次の h2 まで。Visual Stage ではスラブの中）
  const scope = isVisual ? section.closest('.exhibition-slab') : null;
  const paras = isVisual ? Array.from(scope.querySelectorAll('p')) : (() => {
    const out = [];
    for (let n = section.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) if (n.tagName === 'P') out.push(n);
    return out;
  })();
  const money = paras.find(p => /金額/.test(p.textContent));
  const escaped = paras.find(p => /表示できます/.test(p.textContent));
  const codeWithDollar = Array.from(root.querySelectorAll('code')).filter(c => c.textContent.includes('$'));
  return {
    rendered: {
      total: all.length,
      inline: all.filter(e => e.dataset.display === 'false').length,
      display: all.filter(e => e.dataset.display === 'true' && e.querySelector('.katex-display')).length,
      katex: all.filter(e => e.querySelector('.katex')).length,
      errors: root.querySelectorAll('.katex-error').length
    },
    notMath: {
      money: !!money && !money.querySelector('.lucivo-math') && /\$5 と \$10/.test(money.textContent),
      escaped: !!escaped && /\$100/.test(escaped.textContent) && !/\\\$100/.test(escaped.textContent) && escaped.querySelectorAll('.lucivo-math').length === 0,
      code: codeWithDollar.length >= 3 && codeWithDollar.every(c => !c.querySelector('.lucivo-math'))
    }
  };
}

async function testMathRendering(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  const rows = { 'TC-MATH-001': [], 'TC-MATH-002': [] };
  for (const mode of MD_MODES) {
    await setMode(page, mode);
    const r = await page.evaluate(inspectMath, mode.style !== 'std');
    const tag = `${mode.style}-${mode.appearance}`;
    const m = r.rendered;
    rows['TC-MATH-001'].push({ tag, ok: m.total === 5 && m.inline === 3 && m.display === 2 && m.katex === 5 && m.errors === 0, ...m });
    rows['TC-MATH-002'].push({ tag, ok: Object.values(r.notMath).every(Boolean), ...r.notMath });
  }
  for (const [tc, list] of Object.entries(rows)) record(tc, list.every(x => x.ok), JSON.stringify(list));
  if (page.consoleErrors.length) record('TC-MATH-CONSOLE', false, JSON.stringify(page.consoleErrors));

  // TC-MATH-009（HTML エクスポートの数式）は、0.2.0 で HTML の書き出しを外したため保留（CR-001）
  await setMode(page, { style: 'std', appearance: 'light' });

  // TC-MATH-003 誤りのある数式・TC-MATH-006 安全性
  const doc = [
    '誤り: $\\frac{1}{$ の後も描画が続く。正しい数式 $a^2$。',
    '',
    'リンク: $\\href{javascript:alert(1)}{x}$',
    '',
    'タグ: $<img src=x onerror="window.__xss=1">$'
  ].join('\n');
  const bad = await page.evaluate(async src => {
    const ed = document.getElementById('markdown-editor');
    ed.value = src;
    renderApp();
    await new Promise(r => { setTimeout(r, 300); });
    const root = document.getElementById('standard-doc-container');
    return {
      errorShown: root.querySelectorAll('.katex-error').length >= 1,
      validRendered: Array.from(root.querySelectorAll('.lucivo-math .katex')).some(k => /a/.test(k.textContent) && /2/.test(k.textContent)),
      jsLinks: root.querySelectorAll('a[href^="javascript"]').length,
      imgs: root.querySelectorAll('img').length,
      xss: !!window.__xss
    };
  }, doc);
  record('TC-MATH-003', bad.errorShown && bad.validRendered, JSON.stringify(bad));
  record('TC-MATH-006', bad.jsLinks === 0 && bad.imgs === 0 && !bad.xss, JSON.stringify(bad));
  await page.close();

  // TC-MATH-004 KaTeX を読み込めない場合は原文を表示する
  const ctx = await browser.newContext();
  await ctx.route('**/vendor/katex/**', route => route.abort());
  const offline = await ctx.newPage();
  const pageErrors = [];
  offline.on('pageerror', e => pageErrors.push(e.message));
  await offline.goto(APP_URL);
  await offline.waitForFunction(() => typeof renderApp === 'function');
  await offline.setInputFiles('#file-input', SAMPLE);
  await offline.waitForFunction(() => document.getElementById('markdown-editor').value.length > 0);
  await offline.waitForTimeout(500);
  const raw = await offline.evaluate(() => {
    const root = document.getElementById('standard-doc-container');
    return { katex: !!window.katex, text: Array.from(root.querySelectorAll('.lucivo-math')).map(e => e.textContent).slice(0, 2), h1: !!root.querySelector('h1') };
  });
  record('TC-MATH-004', !raw.katex && raw.text[0] === '$E = mc^2$' && raw.h1 && pageErrors.length === 0, JSON.stringify({ ...raw, pageErrors }));
  await ctx.close();
}

// 色の明るさ（0〜1）。ページ内では色の文字列だけを集め、明るさはテスト側で計算する
function inspectFrontMatter(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  const fm = root.querySelector('.front-matter');
  const btn = document.getElementById('btn-front-matter');
  const isTransparent = c => c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  const backdrop = el => {
    for (let n = el; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (!isTransparent(bg)) return bg;
    }
    return 'rgb(255, 255, 255)';
  };
  const h1 = isVisual ? root.querySelector('.exhibition-hero h1') : root.querySelector('h1');
  const first = isVisual ? root.querySelector('.exhibition-slab') : root.firstElementChild;
  const info = {
    pressed: btn.getAttribute('aria-pressed'),
    present: !!fm,
    leakedYaml: /draft: false/.test(root.textContent) && !fm,
    hrBeforeH1: !isVisual && !!h1 && Array.from(root.children).indexOf(root.querySelector('hr')) > -1
      && Array.from(root.children).indexOf(root.querySelector('hr')) < Array.from(root.children).indexOf(h1),
    h1: h1 ? h1.textContent.trim() : null
  };
  if (fm) {
    const key = fm.querySelector('.fm-key'), value = fm.querySelector('.fm-value'), comment = fm.querySelector('.fm-comment');
    const bg = backdrop(fm.querySelector('pre'));
    info.label = fm.querySelector('.front-matter-label').textContent.trim();
    info.text = fm.querySelector('pre').textContent;
    info.keys = fm.querySelectorAll('.fm-key').length;
    info.comments = fm.querySelectorAll('.fm-comment').length;
    info.colors = { key: getComputedStyle(key).color, value: getComputedStyle(value).color, comment: getComputedStyle(comment).color, bg };
    info.mono = /JetBrains Mono|monospace/.test(getComputedStyle(fm.querySelector('pre')).fontFamily);
    info.atTop = isVisual ? first.contains(fm) && first.firstElementChild === fm : first === fm;
  }
  return info;
}

async function testFrontMatter(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  const sampleYaml = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(SAMPLE, 'utf8'))[1].replace(/\r/g, '');

  // TC-FM-001 起動直後は OFF で、フロントマターが本文に現れない
  const off = await page.evaluate(inspectFrontMatter, false);
  record('TC-FM-001', off.pressed === 'false' && !off.present && !off.leakedYaml && !off.hrBeforeH1 && off.h1 === 'Lucivo サンプル文書', JSON.stringify(off));

  // TC-FM-002 ON にすると、本文モードごとに書いたとおりの YAML が色分けされて本文の前に表示される
  await page.click('#btn-front-matter');
  await waitRendered(page);
  const rows = [];
  for (const mode of MD_MODES) {
    await setMode(page, mode);
    const isVisual = mode.style !== 'std';
    const r = await page.evaluate(inspectFrontMatter, isVisual);
    const c = r.colors || {};
    const ok = r.pressed === 'true' && r.present && r.text === sampleYaml && r.label === 'Front Matter' && r.mono && r.atTop
      && r.keys >= 6 && r.comments === 1 && c.key !== c.value && c.key !== c.bg && c.value !== c.bg && c.comment !== c.bg;
    rows.push({ tag: `${mode.style}-${mode.appearance}`, ok, keys: r.keys, comments: r.comments, colors: c, atTop: r.atTop, textMatches: r.text === sampleYaml });
    const box = await page.$(`${isVisual ? '#visual-stage-container' : '#standard-doc-container'} .front-matter`);
    if (box) await box.screenshot({ path: path.join(SHOT_DIR, `fm-${mode.style}-${mode.appearance}.png`) });
  }
  record('TC-FM-002', rows.every(r => r.ok), JSON.stringify(rows));

  // TC-FM-003 Visual Stage で OFF にでき、通常モードに戻っても OFF のまま
  await page.click('#btn-front-matter');
  await waitRendered(page);
  const visOff = await page.evaluate(inspectFrontMatter, true);
  await setMode(page, { style: 'std', appearance: 'light' });
  const stdOff = await page.evaluate(inspectFrontMatter, false);
  record('TC-FM-003', !visOff.present && visOff.pressed === 'false' && !stdOff.present && stdOff.pressed === 'false', JSON.stringify({ visOff, stdOff }));

  // TC-FM-004 フロントマターでない --- は水平線のまま。ON でも枠は出ない
  await page.click('#btn-front-matter');
  const notFm = await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    const root = document.getElementById('standard-doc-container');
    const results = {};
    ed.value = '---\n\n# 見出し\n\n本文';
    renderApp();
    results.unclosed = { fm: !!root.querySelector('.front-matter'), hr: root.querySelectorAll('hr').length };
    ed.value = '# 見出し\n\n---\n\ntitle: x\n\n---\n';
    renderApp();
    results.middle = { fm: !!root.querySelector('.front-matter'), hr: root.querySelectorAll('hr').length };
    ed.value = '---\n---\n# 見出し';
    renderApp();
    results.empty = { fm: !!root.querySelector('.front-matter'), h1: !!root.querySelector('h1'), hr: root.querySelectorAll('hr').length };
    return results;
  });
  record('TC-FM-004', !notFm.unclosed.fm && notFm.unclosed.hr === 1 && !notFm.middle.fm && notFm.middle.hr === 2 && notFm.empty.fm && notFm.empty.h1 && notFm.empty.hr === 0,
    JSON.stringify(notFm));

  // TC-FM-005 フロントマターの中の HTML は文字として表示され、実行されない
  const safe = await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    ed.value = '---\ntitle: <img src=x onerror="window.__fmxss=1">\n# <script>window.__fmxss=2</script>\n---\n本文';
    renderApp();
    const fm = document.querySelector('#standard-doc-container .front-matter');
    return { fm: !!fm, imgs: fm ? fm.querySelectorAll('img, script').length : -1, shown: fm ? /<img src=x/.test(fm.textContent) : false, xss: !!window.__fmxss };
  });
  await page.waitForTimeout(200);
  const xssAfter = await page.evaluate(() => !!window.__fmxss);
  record('TC-FM-005', safe.fm && safe.imgs === 0 && safe.shown && !safe.xss && !xssAfter, JSON.stringify({ ...safe, xssAfter }));
  if (page.consoleErrors.length) record('TC-FM-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

// 記述パターン別の雛形（FR-016）: 章ごとの雛形を調べる。ページ内で実行する。
async function testTree(browser) {
  const page = await openStagePage(browser);
  const md = [
    '# ツリー', '',
    'フォルダ1', '├フォルダ2', '└ファイル', '',
    '```', 'lucivo/', '├── public/', '│   ├── index.html', '│   └── js/', '│       ├── app.js      # 本体', '│       └── profile.png', '└── README  ← 説明', '```', '',
    '```tree', 'project', '|-- src', '|   `-- main.py', '`-- assets', '```', '',
    '```tree', 'docs/', '  guide/', '    intro.md', '  ...', '```', '',
    '```text', '├ そのまま', '└ 表示する', '```', '',
    '├ 1 行だけの罫線は段落のまま', '',
    '記号の入った文章', '|- この行と', '|- この行があっても、段落の ASCII の罫線はツリーにしない', ''
  ].join('\n');
  const inspect = () => page.evaluate(() => {
    const root = document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
    return {
      trees: Array.from(root.querySelectorAll('.md-tree')).map(t => Array.from(t.querySelectorAll('.md-tree-row')).map(r =>
        Array.from(r.querySelectorAll('.md-tree-g')).map(g => g.className.replace('md-tree-g is-', '')).join(',') + '|'
        + r.querySelector('.md-tree-icon').className.replace('md-tree-icon is-', '') + '|' + r.querySelector('.md-tree-name').textContent)),
      notes: Array.from(root.querySelectorAll('.md-tree-note')).map(n => n.textContent).filter(Boolean),
      pres: Array.from(root.querySelectorAll('pre')).map(p => p.textContent.trim().split('\n')[0]),
      paras: Array.from(root.querySelectorAll('p')).map(p => p.textContent.trim()).filter(t => /罫線|文章/.test(t)),
      // 縦線と横線が描かれている（::before / ::after の枠）
      lineShown: (() => {
        const g = root.querySelector('.md-tree-g.is-tee');
        if (!g) return false;
        const before = getComputedStyle(g, '::before');
        const after = getComputedStyle(g, '::after');
        return before.borderLeftStyle === 'solid' && after.borderTopStyle === 'solid';
      })()
    };
  });
  await setDocument(page, md);
  const fast = await inspect();
  const expected = [
    ['|folder|フォルダ1', 'tee|folder|フォルダ2', 'end|file|ファイル'],
    ['|folder|lucivo', 'tee|folder|public', 'pipe,tee|code|index.html', 'pipe,end|folder|js', 'pipe,blank,tee|code|app.js', 'pipe,blank,end|image|profile.png', 'end|file|README'],
    ['|folder|project', 'tee|folder|src', 'pipe,end|code|main.py', 'end|folder|assets'],
    ['|folder|docs', 'tee|folder|guide', 'pipe,end|doc|intro.md', 'end|file|...']
  ];
  // TC-MD-017: 段落・言語名なし・ASCII・字下げの書き方を、階層・枝の形・アイコン・注釈として読む
  record('TC-MD-017', JSON.stringify(fast.trees) === JSON.stringify(expected) && fast.notes.join() === '本体,説明' && fast.lineShown,
    JSON.stringify({ trees: fast.trees, notes: fast.notes, lineShown: fast.lineShown }));
  // TC-MD-018: text と書いたコードブロック、罫線が 1 行だけの段落、記号の入った普通の文章は、ツリーにしない
  record('TC-MD-018', fast.pres.length === 1 && fast.pres[0] === '├ そのまま' && fast.paras.length === 2,
    JSON.stringify({ pres: fast.pres, paras: fast.paras }));

  // TC-MD-019: Visualモード（Light / Dark）でも同じツリーを描き、同梱の発展サンプルの 12 章もツリーになる
  const visualRows = [];
  for (const appearance of ['light', 'dark']) {
    await setMode(page, { style: 'cards', appearance });
    const v = await inspect();
    visualRows.push({ appearance, same: JSON.stringify(v.trees) === JSON.stringify(expected), lineShown: v.lineShown });
  }
  await setMode(page, { style: 'std', appearance: 'light' });
  await page.evaluate(() => { currentSampleFile = 'notation_sample_extra1.md'; });
  await setDocument(page, fs.readFileSync(path.join(APP_DIR, 'samples', 'notation_sample_extra1.md'), 'utf8'));
  const sample = await inspect();
  record('TC-MD-019', visualRows.every(r => r.same && r.lineShown) && sample.trees.length === 3
    && sample.trees[1].join('/') === '|folder|資料/tee|doc|企画書.md/tee|folder|画像フォルダ/pipe,end|image|全体図.png/end|doc|議事録.md'
    && page.consoleErrors.length === 0,
  JSON.stringify({ visualRows, sampleTrees: sample.trees, errors: page.consoleErrors }));
  await page.context().close();
}

// Web 版（http://）として public/ を配る、テスト用の小さなサーバー。Web 版だけの機能（#61・#62）を確かめる
async function startWebServer() {
  const http = require('http');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const rel = ((req.url || '/').split('?')[0].replace(/^\/+/, '')) || 'index.html';
    const fp = path.join(APP_DIR, decodeURIComponent(rel));
    if (!fp.startsWith(APP_DIR) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(resolve => server.close(resolve)) };
}

// Web 版でページを開き、同梱の visual-sample.md を「ファイルを開く…」で読み込む
async function openWebPageWithSample(browser, server, contextOptions = {}, sampleName = 'visual-sample.md') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions });
  const page = await context.newPage();
  page.consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') page.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => page.consoleErrors.push('pageerror: ' + e.message));
  await page.goto(server.url);
  await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
  await page.click('#btn-file-menu');
  await page.setInputFiles('#file-input', path.join(APP_DIR, 'samples', sampleName));
  await page.waitForFunction(n => document.title === `${n} - Lucivo`, sampleName);
  await waitRendered(page);
  return page;
}

// ズーミング・マップ（TC-SHOW-015〜019、FR-054、#61）
async function testFormatter(browser) {
  const page = await openStagePage(browser);
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  const expected = fs.readFileSync(path.join(FORMAT_FIXTURE, 'messy.expected.md'), 'utf8');
  const raw = fs.readFileSync(path.join(FORMAT_FIXTURE, 'messy.md'), 'utf8');

  // TC-FILE-040: 起動しただけでは、整形の部品（js/formatter.js）を読み込まない（NFR-006）
  const atStartup = await page.evaluate(() => ({
    script: Array.from(document.scripts).some(s => /formatter\.js/.test(s.src)),
    global: typeof window.LucivoFormatter !== 'undefined'
  }));

  // TC-FILE-036: ファイルを開くと整えて表示し、整えた内容を読み込んだ状態（編集していない）として扱う
  const open = async (file, title) => {
    await page.click('#btn-file-menu');
    await page.setInputFiles('#file-input', file);
    await page.waitForFunction(t => document.title === `${t} - Lucivo`, title);
    await waitRendered(page);
    return page.evaluate(() => ({
      value: document.getElementById('markdown-editor').value,
      dirty: document.getElementById('markdown-editor').value !== lastLoadedMarkdown,
      toast: document.getElementById('toast-message').textContent,
      h1: (document.querySelector('#standard-doc-container h1') || {}).textContent,
      h2: (document.querySelector('#standard-doc-container h2') || {}).textContent,
      // 最初の表（引用の外の表）の本体の行の数
      rows: (document.querySelector('#standard-doc-container > table, #standard-doc-container .table-wrap table, #standard-doc-container table') || { querySelectorAll: () => [] }).querySelectorAll('tbody tr').length,
      br: document.querySelectorAll('#standard-doc-container p br').length
    }));
  };
  const formatted = await open(path.join(FORMAT_FIXTURE, 'messy.md'), 'messy.md');
  record('TC-FILE-036', formatted.value === expected && !formatted.dirty && /を読み込みました。.*を整えました$/.test(formatted.toast)
    && formatted.h1 === '見出しの空白がない' && formatted.h2 === '空白が多い見出し' && formatted.rows === 2 && formatted.br === 2 && !atStartup.script,
  JSON.stringify({ sameAsExpected: formatted.value === expected, dirty: formatted.dirty, toast: formatted.toast, h1: formatted.h1, h2: formatted.h2, rows: formatted.rows, br: formatted.br }));

  // TC-FILE-037: 整えた文書をもう一度整えても変わらない（何度開いても同じ結果になる）
  const again = await page.evaluate(text => window.LucivoFormatter.format(text), expected);
  record('TC-FILE-037', !again.changed && again.text === expected, JSON.stringify({ changed: again.changed, fixes: again.fixes, tables: again.tables }));

  // TC-FILE-038: 設定で読み込み時の整形を止めると、開いた文書をそのまま表示する。止めた設定はブラウザに残る
  await page.click('#btn-open-settings');
  const toggleBefore = await page.isChecked('#setting-format-on-load');
  await page.uncheck('#setting-format-on-load');
  await page.click('#btn-close-settings');
  await page.reload();
  await page.waitForFunction(() => typeof renderApp === 'function');
  const toggleAfterReload = await page.evaluate(() => document.getElementById('setting-format-on-load').checked);
  const plain = await open(path.join(FORMAT_FIXTURE, 'messy.md'), 'messy.md');
  record('TC-FILE-038', toggleBefore && !toggleAfterReload && plain.value === raw && !plain.dirty && /を読み込みました$/.test(plain.toast),
    JSON.stringify({ toggleBefore, toggleAfterReload, sameAsRaw: plain.value === raw, toast: plain.toast }));

  // TC-FILE-039: 設定の「今の文書を整える」で、エディタの文書を整える。整えた内容は保存していない編集として扱う
  await page.click('#btn-open-settings');
  await page.click('#btn-format-now');
  await page.waitForFunction(t => document.getElementById('markdown-editor').value === t, expected, { timeout: 10000 }).catch(() => {});
  const manual = await page.evaluate(() => ({
    value: document.getElementById('markdown-editor').value,
    dirty: document.getElementById('markdown-editor').value !== lastLoadedMarkdown,
    toast: document.getElementById('toast-message').textContent,
    modalClosed: document.getElementById('settings-modal').classList.contains('hidden')
  }));
  record('TC-FILE-039', manual.value === expected && manual.dirty && /を整えました（保存すると反映されます）$/.test(manual.toast) && manual.modalClosed,
    JSON.stringify({ sameAsExpected: manual.value === expected, dirty: manual.dirty, toast: manual.toast, modalClosed: manual.modalClosed }));

  // TC-FILE-040: 同梱サンプルは、読み込み時の整形をオンにしていても整えない（DD-FILE-091）
  await page.click('#btn-open-settings');
  await page.check('#setting-format-on-load');
  await page.click('#btn-close-settings');
  const sampleFile = 'notation_sample_extra1.md';
  await page.click('#btn-file-menu');
  await page.click(`[data-sample-file="${sampleFile}"]`);
  await page.waitForFunction(t => document.title === `${t} - Lucivo`, sampleFile);
  await waitRendered(page);
  const sampleValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const sampleRaw = fs.readFileSync(path.join(APP_DIR, 'samples', sampleFile), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  record('TC-FILE-040', sampleValue === sampleRaw && !atStartup.global && dialogs.length === 1,
    JSON.stringify({ sameAsFile: sampleValue === sampleRaw, startupGlobal: atStartup.global, dialogs }));
  await page.context().close();
}

// 文字コードと改行コード（TC-FILE-029〜031）。サンプルは tests/fixtures/encoding/source.md を各文字コード・改行コードで書いたもの
const ENCODING_FIXTURE = path.join(ROOT_DIR, 'tests', 'fixtures', 'encoding');
const ENCODING_CASES = [
  ['utf8-lf.md', 'UTF-8'], ['utf8-crlf.md', 'UTF-8'], ['utf8-cr.md', 'UTF-8'], ['utf8-mixed.md', 'UTF-8'],
  ['utf8-bom-crlf.md', 'UTF-8 (BOM)'], ['utf16le-bom-crlf.md', 'UTF-16LE'],
  ['sjis-crlf.md', 'Shift_JIS'], ['sjis-lf.md', 'Shift_JIS'], ['eucjp-lf.md', 'EUC-JP'], ['iso2022jp-lf.md', 'ISO-2022-JP']
];


module.exports = {
  testMarkdownTypography,
  testMathRendering,
  testFrontMatter,
  testTree,
  testFormatter
};
