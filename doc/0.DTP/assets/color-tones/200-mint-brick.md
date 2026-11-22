# 200. 薄荷と煉瓦（Mint Brick）

- **ID**: `mint-brick`
- **トーン区分**: うすい＋にぶい（pale + dull）
- **配色技法**: 色相配色（ミントと煉瓦色の補色の 2 色）
- **基にした配色**: `#93CCBE`（ミント）、`#C47550`（煉瓦）
- **印象・用途**: 昔の喫茶店のタイル。懐かしく親しみやすい、カフェ・カルチャー向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・煉瓦）</td><td><code>--vs-c1</code></td><td><span style="background-color: #C47550; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#C47550</span></td><td><span style="background-color: #C47550; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#C47550</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ミント）</td><td><code>--vs-c2</code></td><td><span style="background-color: #499B87; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#499B87</span></td><td><span style="background-color: #93CCBE; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#93CCBE</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・煉瓦の濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #8A4C2E; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#8A4C2E</span></td><td><span style="background-color: #DFB39F; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#DFB39F</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ミントの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #2F6457; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#2F6457</span></td><td><span style="background-color: #C4E3DB; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#C4E3DB</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #EFF7F5; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#EFF7F5</span></td><td><span style="background-color: #1F130D; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#1F130D</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #D9EDE8; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#D9EDE8</span></td><td><span style="background-color: #2F1C13; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#2F1C13</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #EFF7F5; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9A8B82;">#9A8B82</span></td><td><span style="background-color: #1F130D; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #60635D;">#60635D</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #EFF7F5; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#553323</span></td><td><span style="background-color: #1F130D; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#C9E6DF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #C47550; color: #553323; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A8B82;">#C47550</span></td><td><span style="background-color: #C47550; color: #C9E6DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #60635D;">#C47550</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
