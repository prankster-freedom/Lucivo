# 28. 波の泡と石畳（Seafoam Cobble）

- **ID**: `seafoam-cobble`
- **トーン区分**: うすい＋くらいはいみ（pale + dark grayish）
- **配色技法**: アクセントカラー（淡いミントとグレージュの地を、暗いスレートで引き締める）
- **基にした配色**: `#CCE7E3`（ミント）、`#DED1C2`（グレージュ）、`#44535A`（スレート）
- **印象・用途**: 海辺の街の石畳。清潔で落ち着いた、サービス紹介・マニュアル向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・スレート）</td><td><code>--vs-c1</code></td><td><span style="background-color: #44535A; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#44535A</span></td><td><span style="background-color: #CCE7E3; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#CCE7E3</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ミント）</td><td><code>--vs-c2</code></td><td><span style="background-color: #6FB0A6; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#6FB0A6</span></td><td><span style="background-color: #DED1C2; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#DED1C2</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・グレージュ）</td><td><code>--vs-c3</code></td><td><span style="background-color: #B19F89; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#B19F89</span></td><td><span style="background-color: #9FB4BC; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#9FB4BC</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・霧）</td><td><code>--vs-c4</code></td><td><span style="background-color: #7D8F96; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#7D8F96</span></td><td><span style="background-color: #B7C7CC; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#B7C7CC</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F2F8F6; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#F2F8F6</span></td><td><span style="background-color: #1F272B; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#1F272B</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #E4F1EE; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#E4F1EE</span></td><td><span style="background-color: #2C363B; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#2C363B</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F2F8F6; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7B8A8F;">#7B8A8F</span></td><td><span style="background-color: #1F272B; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #5C6B71;">#5C6B71</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F2F8F6; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#253035</span></td><td><span style="background-color: #1F272B; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#F2F8F6</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #CCE7E3; color: #253035; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7B8A8F;">#CCE7E3</span></td><td><span style="background-color: #CCE7E3; color: #F2F8F6; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5C6B71;">#CCE7E3</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
