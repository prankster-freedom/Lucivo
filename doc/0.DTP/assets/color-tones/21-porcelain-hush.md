# 21. 白磁と静けさ（Porcelain Hush）

- **ID**: `porcelain-hush`
- **トーン区分**: ごくうすい＋くらいはいみ（very pale + dark grayish）
- **配色技法**: アクセントカラー（淡い青白・セージ・オフホワイトの地に、暗い紫灰を少しだけ）
- **基にした配色**: `#E9EFF4`（淡い青白）、`#CED4BE`（セージ）、`#EFE9DF`（オフホワイト）、`#51505D`（紫灰）
- **印象・用途**: 静寂と心の安らぎ。落ち着いた自然な色調で、ナチュラルな読み物・振り返りの資料向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・紫灰）</td><td><code>--vs-c1</code></td><td><span style="background-color: #51505D; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#51505D</span></td><td><span style="background-color: #A9A6C0; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#A9A6C0</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・セージ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #9AA383; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#9AA383</span></td><td><span style="background-color: #CED4BE; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#CED4BE</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・青白）</td><td><code>--vs-c3</code></td><td><span style="background-color: #8FA6BA; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#8FA6BA</span></td><td><span style="background-color: #B9C9D8; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#B9C9D8</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・オフホワイト）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B8A58E; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#B8A58E</span></td><td><span style="background-color: #E6DCCB; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#E6DCCB</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #E9EFF4; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#E9EFF4</span></td><td><span style="background-color: #24232B; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#24232B</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EFE9DF; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#EFE9DF</span></td><td><span style="background-color: #33323D; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#33323D</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #E9EFF4; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8A8994;">#8A8994</span></td><td><span style="background-color: #24232B; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6E6C7A;">#6E6C7A</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #E9EFF4; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#2C2B33</span></td><td><span style="background-color: #24232B; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#EFE9DF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #CED4BE; color: #2C2B33; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8994;">#CED4BE</span></td><td><span style="background-color: #E9EFF4; color: #EFE9DF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6C7A;">#E9EFF4</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
