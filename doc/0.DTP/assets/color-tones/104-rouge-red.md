# 104. ルージュの赤（Rouge Red）

- **ID**: `rouge-red`
- **トーン区分**: さえた＋くらい（vivid + dark）
- **配色技法**: ドミナント・カラー（赤からマゼンタの色相でそろえ、バーガンディで締める）
- **基にした配色**: `#E30613`（レッド）、`#E7398D`（マゼンタ）、`#7C1622`（バーガンディ）、`#FBF5E6`（クリーム）
- **印象・用途**: 口紅と薔薇。情熱的で華やかな、コスメ・ファッション向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・レッド）</td><td><code>--vs-c1</code></td><td><span style="background-color: #E30613; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#E30613</span></td><td><span style="background-color: #F20614; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#F20614</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・マゼンタ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #E7398D; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#E7398D</span></td><td><span style="background-color: #E7398D; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#E7398D</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・バーガンディ）</td><td><code>--vs-c3</code></td><td><span style="background-color: #7C1622; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#7C1622</span></td><td><span style="background-color: #DD3F51; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#DD3F51</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・レッドの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #BB0510; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#BB0510</span></td><td><span style="background-color: #F0767D; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#F0767D</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FBF5E6; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#FBF5E6</span></td><td><span style="background-color: #1C0204; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#1C0204</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F9E2D5; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#F9E2D5</span></td><td><span style="background-color: #2A0306; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#2A0306</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FBF5E6; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9A7573;">#9A7573</span></td><td><span style="background-color: #1C0204; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #72605F;">#72605F</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FBF5E6; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#4A0D14</span></td><td><span style="background-color: #1C0204; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#FDFAF3</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #FBF5E6; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9A7573;">#FBF5E6</span></td><td><span style="background-color: #FBF5E6; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #72605F;">#FBF5E6</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
