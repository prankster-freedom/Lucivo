# 139. 絵の具のチューリップ（Painted Tulips）

- **ID**: `painted-tulips`
- **トーン区分**: あかるい＋こい（bright + deep）
- **配色技法**: 色相配色（オレンジを主役に、ティールとインディゴで対比をつける）
- **基にした配色**: `#F18448`（オレンジ）、`#68C1BD`（ティール）、`#354093`（インディゴ）、`#FCE1E7`（ピンク）
- **印象・用途**: 子どもの描いた花。のびやかで温かい、教育・地域の話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オレンジ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #E05B11; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#E05B11</span></td><td><span style="background-color: #F18448; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#F18448</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・インディゴ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #354093; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#354093</span></td><td><span style="background-color: #6E78CB; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#6E78CB</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ティール）</td><td><code>--vs-c3</code></td><td><span style="background-color: #3C918E; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#3C918E</span></td><td><span style="background-color: #68C1BD; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#68C1BD</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・オレンジの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #903A0B; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#903A0B</span></td><td><span style="background-color: #F7BB9A; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#F7BB9A</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FCE1E7; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#FCE1E7</span></td><td><span style="background-color: #181012; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#181012</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FBDADA; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#FBDADA</span></td><td><span style="background-color: #23181A; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#23181A</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FCE1E7; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #837A98;">#837A98</span></td><td><span style="background-color: #181012; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6F6568;">#6F6568</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FCE1E7; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#202658</span></td><td><span style="background-color: #181012; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#FEF0F3</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F18448; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #837A98;">#F18448</span></td><td><span style="background-color: #F18448; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6568;">#F18448</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
