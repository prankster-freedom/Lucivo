# 179. メンフィスの図形（Memphis Shapes）

- **ID**: `memphis-shapes`
- **トーン区分**: つよい＋うすい（strong + pale）
- **配色技法**: 色相配色（赤とインディゴの対比を、淡い桃色と白でやわらげる）
- **基にした配色**: `#EC6159`（レッド）、`#4B55A1`（インディゴ）、`#FDD9BB`（桃色）、`#F1F6F9`（白）
- **印象・用途**: 80 年代のポップな図形。遊び心とトレンド感のある、デザイン・イベント向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・レッド）</td><td><code>--vs-c1</code></td><td><span style="background-color: #EC6159; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#EC6159</span></td><td><span style="background-color: #EC6159; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#EC6159</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・インディゴ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #4B55A1; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#4B55A1</span></td><td><span style="background-color: #717ABD; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#717ABD</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・桃色）</td><td><code>--vs-c3</code></td><td><span style="background-color: #BA8050; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#BA8050</span></td><td><span style="background-color: #FDD9BB; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#FDD9BB</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・レッドの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B61E15; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#B61E15</span></td><td><span style="background-color: #F5A8A4; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#F5A8A4</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F1F6F9; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#F1F6F9</span></td><td><span style="background-color: #190F14; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#190F14</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F1EAEC; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#F1EAEC</span></td><td><span style="background-color: #25161E; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#25161E</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F1F6F9; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #858BA5;">#858BA5</span></td><td><span style="background-color: #190F14; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6E696C;">#6E696C</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F1F6F9; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#2D3361</span></td><td><span style="background-color: #190F14; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#F8FBFC</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EC6159; color: #2D3361; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #858BA5;">#EC6159</span></td><td><span style="background-color: #EC6159; color: #F8FBFC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E696C;">#EC6159</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
