# 138. 風船のパーティー（Balloon Party）

- **ID**: `balloon-party`
- **トーン区分**: さえた＋うすい（vivid + pale）
- **配色技法**: 色相配色（オレンジとティールの補色に、インディゴを締め色に置く）
- **基にした配色**: `#F5A04E`（オレンジ）、`#65C1BE`（ティール）、`#354093`（インディゴ）、`#F8E5EE`（淡いピンク）
- **印象・用途**: 空に放たれた風船。楽しく弾む、子ども・お祝いの話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オレンジ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #CC6A0C; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#CC6A0C</span></td><td><span style="background-color: #F5A04E; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#F5A04E</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・インディゴ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #354093; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#354093</span></td><td><span style="background-color: #6E78CB; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#6E78CB</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ティール）</td><td><code>--vs-c3</code></td><td><span style="background-color: #3A908D; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#3A908D</span></td><td><span style="background-color: #65C1BE; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#65C1BE</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・オレンジの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #844507; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#844507</span></td><td><span style="background-color: #FACB9E; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#FACB9E</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F8E5EE; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#F8E5EE</span></td><td><span style="background-color: #181212; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#181212</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F8DFE1; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#F8DFE1</span></td><td><span style="background-color: #241B1B; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#241B1B</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F8E5EE; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #817C9C;">#817C9C</span></td><td><span style="background-color: #181212; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6F6769;">#6F6769</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F8E5EE; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#202658</span></td><td><span style="background-color: #181212; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#FCF2F7</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F5A04E; color: #202658; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #817C9C;">#F5A04E</span></td><td><span style="background-color: #F5A04E; color: #FCF2F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6769;">#F5A04E</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
