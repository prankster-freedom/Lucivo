# 141. スプリンクルのアイス（Sprinkle Cone）

- **ID**: `sprinkle-cone`
- **トーン区分**: つよい＋うすい（strong + pale）
- **配色技法**: 色相配色（コーラルと緑の補色に、青と淡いピンクを添える）
- **基にした配色**: `#EF7A62`（コーラル）、`#21A48F`（グリーン）、`#8AB2DF`（ブルー）、`#F9CED0`（ピンク）
- **印象・用途**: カラフルなアイスクリーム。楽しく甘い、スイーツ・夏の告知向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・コーラル）</td><td><code>--vs-c1</code></td><td><span style="background-color: #ED664B; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#ED664B</span></td><td><span style="background-color: #EF7A62; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#EF7A62</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・グリーン）</td><td><code>--vs-c2</code></td><td><span style="background-color: #20A08B; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#20A08B</span></td><td><span style="background-color: #21A48F; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#21A48F</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ブルー）</td><td><code>--vs-c3</code></td><td><span style="background-color: #5A92D2; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#5A92D2</span></td><td><span style="background-color: #8AB2DF; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#8AB2DF</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ピンク）</td><td><code>--vs-c4</code></td><td><span style="background-color: #C17C7F; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#C17C7F</span></td><td><span style="background-color: #F9CED0; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#F9CED0</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FEF8F8; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#FEF8F8</span></td><td><span style="background-color: #161713; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#161713</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FDEEEF; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#FDEEEF</span></td><td><span style="background-color: #21221D; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#21221D</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FEF8F8; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7A9591;">#7A9591</span></td><td><span style="background-color: #161713; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6D6664;">#6D6664</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FEF8F8; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#0E443C</span></td><td><span style="background-color: #161713; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#FCE7E8</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EF7A62; color: #0E443C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A9591;">#EF7A62</span></td><td><span style="background-color: #EF7A62; color: #FCE7E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6664;">#EF7A62</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
