const fs = require("fs");
const LIMIT = 120;
const wide = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;
const w = s => [...s].reduce((a, c) => a + (wide.test(c) ? 2 : 1), 0);
const split = l => l.trim().slice(1, -1).split("|").map(c => c.trim());
function fmt(block) {
  const indent = block[0].match(/^\s*/)[0];
  let rows = block.map(split);
  const n = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => r.concat(Array(n - r.length).fill("")));
  const data = rows.map((_, j) => j).filter(j => j > 1);
  const k = Math.max(1, Math.floor(data.length / 3)); // 途中の列で例外にできる行数
  const drop = [...Array(n)].map(() => new Set()); // 列ごとの例外セル（行番号）
  const exRows = () => new Set(drop.flatMap(s => [...s]));
  const width = i => Math.max(3, ...rows.filter((_, j) => j !== 1 && !drop[i].has(j)).map(r => w(r[i])));
  const total = () => indent.length + 1 + [...Array(n)].reduce((a, _, i) => a + width(i) + 3, 0);
  while (total() > LIMIT) {
    let best = null;
    for (let i = 0; i < n; i++) {
      const cand = data.filter(j => !drop[i].has(j)).sort((a, b) => w(rows[b][i]) - w(rows[a][i]))[0];
      if (cand === undefined) continue;
      const ex = exRows();
      if (i < n - 1 && !ex.has(cand) && [...ex].length >= k) continue;
      const before = width(i); drop[i].add(cand); const gain = before - width(i); drop[i].delete(cand);
      if (gain > 0 && (!best || gain > best.gain)) best = { i, cand, gain };
    }
    if (!best) break;
    drop[best.i].add(best.cand);
  }
  const ws = [...Array(n)].map((_, i) => width(i));
  return rows.map((r, j) => {
    if (j === 1) return indent + "| " + r.map((c, i) => { const l = c.startsWith(":"), rr = c.endsWith(":"); return (l ? ":" : "") + "-".repeat(ws[i] - l - rr) + (rr ? ":" : ""); }).join(" | ") + " |";
    let line = indent + "|", pos = 0, target = 0;
    r.forEach((c, i) => { target += ws[i] + 3; line += " " + c; pos += 1 + w(c); const pad = Math.max(1, target - pos - 1); line += " ".repeat(pad) + "|"; pos += pad + 1; });
    return line;
  });
}
for (const p of process.argv.slice(2)) {
  const lines = fs.readFileSync(p, "utf8").split("\n"); const res = []; let fence = false;
  for (let i = 0; i < lines.length;) {
    if (lines[i].trimStart().startsWith("```")) fence = !fence;
    if (!fence && lines[i].trim().startsWith("|") && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) {
      let j = i; while (j < lines.length && lines[j].trim().startsWith("|")) j++;
      res.push(...fmt(lines.slice(i, j))); i = j; continue;
    }
    res.push(lines[i++]);
  }
  fs.writeFileSync(p, res.join("\n")); console.log("ok", p);
}
