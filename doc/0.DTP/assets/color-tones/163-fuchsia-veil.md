# 163. フクシアのヴェール（Fuchsia Veil）

- **ID**: `fuchsia-veil`
- **トーン区分**: ごくうすい＋つよい（very pale + strong）
- **配色技法**: アクセントカラー（淡いピンクとラベンダーの地に、マゼンタを少しだけ差す）
- **基にした配色**: `#C561A1`（マゼンタ）、`#D2D2EB`（ラベンダー）、`#FDEFF4`（ピンク）
- **印象・用途**: 淡い花束の一輪。可憐で印象的な、美容・告知向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・マゼンタ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #C561A1; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#C561A1</span></td><td><span style="background-color: #C561A1; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#C561A1</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ラベンダー）</td><td><code>--vs-c2</code></td><td><span style="background-color: #8484C4; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#8484C4</span></td><td><span style="background-color: #D2D2EB; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#D2D2EB</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・マゼンタの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #943672; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#943672</span></td><td><span style="background-color: #DFA8CB; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#DFA8CB</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ラベンダーの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #5050A6; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#5050A6</span></td><td><span style="background-color: #E6E6F4; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#E6E6F4</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEFF4; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#FDEFF4</span></td><td><span style="background-color: #20101A; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#20101A</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F9E4ED; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#F9E4ED</span></td><td><span style="background-color: #2F1727; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#2F1727</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEFF4; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A28395;">#A28395</span></td><td><span style="background-color: #20101A; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #74686F;">#74686F</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEFF4; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#572B48</span></td><td><span style="background-color: #20101A; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#FEF7FA</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #D2D2EB; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A28395;">#D2D2EB</span></td><td><span style="background-color: #D2D2EB; color: #FEF7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74686F;">#D2D2EB</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
