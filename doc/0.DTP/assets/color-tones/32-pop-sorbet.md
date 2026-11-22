# 32. ポップなシャーベット（Pop Sorbet）

- **ID**: `pop-sorbet`
- **トーン区分**: さえた＋ごくうすい（vivid + very pale）
- **配色技法**: 色相配色（白に近いミントの地に、マゼンタ・オレンジ・ライムの鮮やかな 3 色）
- **基にした配色**: `#EA4B94`（マゼンタ）、`#EF7747`（オレンジ）、`#DFDD55`（ライム）、`#E6F2E8`（ミントホワイト）
- **印象・用途**: 弾ける果実のシャーベット。元気で楽しい、イベント告知・キャンペーン向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オレンジ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #EB581D; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#EB581D</span></td><td><span style="background-color: #EF7747; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#EF7747</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・マゼンタ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #EA4B94; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#EA4B94</span></td><td><span style="background-color: #EA4B94; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#EA4B94</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ライム）</td><td><code>--vs-c3</code></td><td><span style="background-color: #8F8E1B; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#8F8E1B</span></td><td><span style="background-color: #DFDD55; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#DFDD55</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・オレンジの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #9F370E; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#9F370E</span></td><td><span style="background-color: #F6B49A; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#F6B49A</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #E6F2E8; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#E6F2E8</span></td><td><span style="background-color: #261012; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#261012</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #E7E8DB; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#E7E8DB</span></td><td><span style="background-color: #39171A; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#39171A</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #E6F2E8; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9D7E8B;">#9D7E8B</span></td><td><span style="background-color: #261012; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #746968;">#746968</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #E6F2E8; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#621F3E</span></td><td><span style="background-color: #261012; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#F3F9F4</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EF7747; color: #621F3E; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D7E8B;">#EF7747</span></td><td><span style="background-color: #EF7747; color: #F3F9F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #746968;">#EF7747</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
