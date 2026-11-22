# 167. 水晶とフクシア（Crystal Fuchsia）

- **ID**: `crystal-fuchsia`
- **トーン区分**: ごくうすい＋つよい（very pale + strong）
- **配色技法**: アクセントカラー（氷色と淡い青の地に、マゼンタを差す）
- **基にした配色**: `#C561A1`（マゼンタ）、`#ADD1EF`（ブルー）、`#F1EDF7`（ラベンダー）、`#EEF8FE`（氷）
- **印象・用途**: 水晶と一輪の花。澄んで華やかな、美容・ブランド向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・マゼンタ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #C561A1; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#C561A1</span></td><td><span style="background-color: #C561A1; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#C561A1</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ブルー）</td><td><code>--vs-c2</code></td><td><span style="background-color: #5993C3; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#5993C3</span></td><td><span style="background-color: #ADD1EF; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#ADD1EF</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・マゼンタの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #983875; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#983875</span></td><td><span style="background-color: #DFA8CB; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#DFA8CB</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ブルーの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #266090; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#266090</span></td><td><span style="background-color: #D2E6F6; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#D2E6F6</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #EEF8FE; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#EEF8FE</span></td><td><span style="background-color: #20101A; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#20101A</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EBECF7; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#EBECF7</span></td><td><span style="background-color: #2F1727; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#2F1727</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #EEF8FE; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9D889C;">#9D889C</span></td><td><span style="background-color: #20101A; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #726A71;">#726A71</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #EEF8FE; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#5B2D4B</span></td><td><span style="background-color: #20101A; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#F7FCFF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #ADD1EF; color: #5B2D4B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D889C;">#ADD1EF</span></td><td><span style="background-color: #ADD1EF; color: #F7FCFF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726A71;">#ADD1EF</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
