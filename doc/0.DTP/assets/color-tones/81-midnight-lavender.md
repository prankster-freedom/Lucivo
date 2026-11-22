# 81. 真夜中のラベンダー（Midnight Lavender）

- **ID**: `midnight-lavender`
- **トーン区分**: くらい＋あかるいはいみ（dark + light grayish）
- **配色技法**: トーン・オン・トーン（青紫の色相で、明度を大きく変える）
- **基にした配色**: `#312A47`（ミッドナイト）、`#C2BDCD`（ラベンダーグレー）
- **印象・用途**: 夜の静寂。静かで知的な、研究・講演向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ミッドナイト）</td><td><code>--vs-c1</code></td><td><span style="background-color: #312A47; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#312A47</span></td><td><span style="background-color: #7D6FAA; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#7D6FAA</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ラベンダーグレー）</td><td><code>--vs-c2</code></td><td><span style="background-color: #9289A5; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#9289A5</span></td><td><span style="background-color: #C2BDCD; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#C2BDCD</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ミッドナイトの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #312A47; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#312A47</span></td><td><span style="background-color: #8E8A9A; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#8E8A9A</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ラベンダーグレーの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #615875; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#615875</span></td><td><span style="background-color: #DDDBE4; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#DDDBE4</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F6F5F8; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#F6F5F8</span></td><td><span style="background-color: #08070B; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#08070B</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EAE8EE; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#EAE8EE</span></td><td><span style="background-color: #0C0A11; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#0C0A11</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F6F5F8; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7F7C87;">#7F7C87</span></td><td><span style="background-color: #08070B; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #5A595E;">#5A595E</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F6F5F8; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#1D192B</span></td><td><span style="background-color: #08070B; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#E1DEE6</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #C2BDCD; color: #1D192B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7F7C87;">#C2BDCD</span></td><td><span style="background-color: #C2BDCD; color: #E1DEE6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5A595E;">#C2BDCD</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
