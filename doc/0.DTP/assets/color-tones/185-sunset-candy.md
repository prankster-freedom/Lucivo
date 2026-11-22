# 185. 夕焼けキャンディ（Sunset Candy）

- **ID**: `sunset-candy`
- **トーン区分**: つよい＋うすい（strong + pale）
- **配色技法**: ドミナント・カラー（赤から橙の暖色でそろえ、淡いピンクを地にする）
- **基にした配色**: `#EB5B44`（レッド）、`#F9AF3C`（オレンジ）、`#FCE1E7`（ピンク）
- **印象・用途**: 夕焼け色のキャンディ。明るく元気な、セール・イベント向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オレンジ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #BA7306; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#BA7306</span></td><td><span style="background-color: #F9AF3C; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#F9AF3C</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・レッド）</td><td><code>--vs-c2</code></td><td><span style="background-color: #EA4F36; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#EA4F36</span></td><td><span style="background-color: #EB5B44; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#EB5B44</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・オレンジの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #7A4B04; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#7A4B04</span></td><td><span style="background-color: #FCD394; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#FCD394</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・レッドの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #A32611; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#A32611</span></td><td><span style="background-color: #F4A598; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#F4A598</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FCE1E7; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#FCE1E7</span></td><td><span style="background-color: #27150A; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#27150A</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FCDDD9; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#FCDDD9</span></td><td><span style="background-color: #3A200F; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#3A200F</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FCE1E7; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A37976;">#A37976</span></td><td><span style="background-color: #27150A; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #796863;">#796863</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FCE1E7; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#5A231A</span></td><td><span style="background-color: #27150A; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#FEF0F3</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F9AF3C; color: #5A231A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37976;">#F9AF3C</span></td><td><span style="background-color: #F9AF3C; color: #FEF0F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796863;">#F9AF3C</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
