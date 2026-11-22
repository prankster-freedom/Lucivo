# 61. パステルの入江（Pastel Lagoon）

- **ID**: `pastel-lagoon`
- **トーン区分**: ごくうすい＋あかるい（very pale + bright）
- **配色技法**: クールシェード（青みの淡色でそろえ、ティールで締める）
- **基にした配色**: `#8DCECF`（ティール）、`#DDE4F5`（ペリウィンクル）、`#DFE5C9`（セージ）、`#FEF4EE`（白）
- **印象・用途**: 穏やかな入江。清潔で落ち着いた、医療・サービス案内向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ティール）</td><td><code>--vs-c1</code></td><td><span style="background-color: #419A9B; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#419A9B</span></td><td><span style="background-color: #8DCECF; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#8DCECF</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・セージ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #859548; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#859548</span></td><td><span style="background-color: #DFE5C9; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#DFE5C9</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ペリウィンクル）</td><td><code>--vs-c3</code></td><td><span style="background-color: #7A8EBF; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#7A8EBF</span></td><td><span style="background-color: #DDE4F5; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#DDE4F5</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ティールの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #2B6465; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#2B6465</span></td><td><span style="background-color: #C0E4E5; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#C0E4E5</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FEF4EE; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#FEF4EE</span></td><td><span style="background-color: #172121; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#172121</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F5F1EC; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#F5F1EC</span></td><td><span style="background-color: #223132; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#223132</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FEF4EE; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8B908E;">#8B908E</span></td><td><span style="background-color: #172121; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6F7372;">#6F7372</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FEF4EE; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#2C3F3F</span></td><td><span style="background-color: #172121; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#FFFAF7</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #8DCECF; color: #2C3F3F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8B908E;">#8DCECF</span></td><td><span style="background-color: #8DCECF; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F7372;">#8DCECF</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
