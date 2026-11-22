# 103. 押し花（Pressed Flowers）

- **ID**: `pressed-flowers`
- **トーン区分**: うすい＋くらい（pale + dark）
- **配色技法**: トーン・オン・トーン（赤紫の色相で、淡いピンクから暗いワインまで明度を変える）
- **基にした配色**: `#A9667D`（モーブ）、`#7B3341`（ワイン）、`#F6CFDD`（ピンク）、`#FEF4EE`（白）
- **印象・用途**: 押し花の標本。ロマンチックで落ち着いた、アート・ギフト向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ワイン）</td><td><code>--vs-c1</code></td><td><span style="background-color: #7B3341; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#7B3341</span></td><td><span style="background-color: #BC5D70; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#BC5D70</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・モーブ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #A9667D; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#A9667D</span></td><td><span style="background-color: #A9667D; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#A9667D</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ピンク）</td><td><code>--vs-c3</code></td><td><span style="background-color: #BE7891; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#BE7891</span></td><td><span style="background-color: #F6CFDD; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#F6CFDD</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ワインの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #7B3341; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#7B3341</span></td><td><span style="background-color: #B68F97; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#B68F97</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FEF4EE; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#FEF4EE</span></td><td><span style="background-color: #14080A; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#14080A</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F4E5E0; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#F4E5E0</span></td><td><span style="background-color: #1E0C10; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#1E0C10</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FEF4EE; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9B7F81;">#9B7F81</span></td><td><span style="background-color: #14080A; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6D6464;">#6D6464</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FEF4EE; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#4A1F27</span></td><td><span style="background-color: #14080A; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#FFFAF7</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F6CFDD; color: #4A1F27; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B7F81;">#F6CFDD</span></td><td><span style="background-color: #F6CFDD; color: #FFFAF7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6464;">#F6CFDD</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
