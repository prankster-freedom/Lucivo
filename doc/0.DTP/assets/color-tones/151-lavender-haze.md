# 151. ラベンダーの霞（Lavender Haze）

- **ID**: `lavender-haze`
- **トーン区分**: うすい＋にぶい（pale + dull）
- **配色技法**: トーン・オン・トーン（青紫の色相で、白からくすんだ青まで明度を変える）
- **基にした配色**: `#7789AE`（くすんだ青）、`#C1BADD`（ラベンダー）、`#F1D8E7`（ピンク）、`#F1EDF7`（白）
- **印象・用途**: 夕暮れの霞。静かで夢見るような、エッセイ・音楽向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・くすんだ青）</td><td><code>--vs-c1</code></td><td><span style="background-color: #7789AE; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#7789AE</span></td><td><span style="background-color: #7789AE; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#7789AE</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ラベンダー）</td><td><code>--vs-c2</code></td><td><span style="background-color: #8D80C0; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#8D80C0</span></td><td><span style="background-color: #C1BADD; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#C1BADD</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ピンク）</td><td><code>--vs-c3</code></td><td><span style="background-color: #BA719D; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#BA719D</span></td><td><span style="background-color: #F1D8E7; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#F1D8E7</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・くすんだ青の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #49597B; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#49597B</span></td><td><span style="background-color: #B4BED2; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#B4BED2</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F1EDF7; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#F1EDF7</span></td><td><span style="background-color: #13161C; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#13161C</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #E7E5F1; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#E7E5F1</span></td><td><span style="background-color: #1D212A; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#1D212A</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F1EDF7; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #878996;">#878996</span></td><td><span style="background-color: #13161C; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6A6B71;">#6A6B71</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F1EDF7; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#303847</span></td><td><span style="background-color: #13161C; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#F8F6FB</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #C1BADD; color: #303847; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878996;">#C1BADD</span></td><td><span style="background-color: #C1BADD; color: #F8F6FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6B71;">#C1BADD</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
