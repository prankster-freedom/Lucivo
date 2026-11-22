# 171. 綿菓子（Cotton Candy）

- **ID**: `cotton-candy`
- **トーン区分**: ごくうすい＋うすい（very pale + pale）
- **配色技法**: ドミナント・トーン（水色・ピンク・ラベンダー・桃色を、淡いトーンでそろえる）
- **基にした配色**: `#BDB5DA`（ラベンダー）、`#CEEAF5`（アクア）、`#FCDBC3`（桃色）、`#FDF0F7`（ピンク）
- **印象・用途**: 縁日の綿菓子。ふんわり楽しい、子ども・スイーツ向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ラベンダー）</td><td><code>--vs-c1</code></td><td><span style="background-color: #9082C0; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#9082C0</span></td><td><span style="background-color: #BDB5DA; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#BDB5DA</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・桃色）</td><td><code>--vs-c2</code></td><td><span style="background-color: #B47F59; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#B47F59</span></td><td><span style="background-color: #FCDBC3; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#FCDBC3</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・アクア）</td><td><code>--vs-c3</code></td><td><span style="background-color: #5494AD; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#5494AD</span></td><td><span style="background-color: #CEEAF5; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#CEEAF5</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ラベンダーの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #604F9D; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#604F9D</span></td><td><span style="background-color: #DBD6EB; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#DBD6EB</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDF0F7; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#FDF0F7</span></td><td><span style="background-color: #1E1D23; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#1E1D23</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F8EBF5; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#F8EBF5</span></td><td><span style="background-color: #2D2B34; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#2D2B34</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDF0F7; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #938C96;">#938C96</span></td><td><span style="background-color: #1E1D23; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #737075;">#737075</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDF0F7; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#3C3A46</span></td><td><span style="background-color: #1E1D23; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#FEF8FB</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #FCDBC3; color: #3C3A46; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938C96;">#FCDBC3</span></td><td><span style="background-color: #FCDBC3; color: #FEF8FB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #737075;">#FCDBC3</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
