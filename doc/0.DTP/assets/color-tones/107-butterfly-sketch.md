# 107. 蝶のスケッチ（Butterfly Sketch）

- **ID**: `butterfly-sketch`
- **トーン区分**: うすい＋こい（pale + deep）
- **配色技法**: 色相配色（深いベリーとワインに、ピンクと杏を添える）
- **基にした配色**: `#94376B`（ベリー）、`#642430`（ワイン）、`#F2BCD7`（ピンク）、`#FDD59C`（杏）
- **印象・用途**: 画家のパレットと蝶。芸術的で生き生きとした、アート・作品紹介向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ベリー）</td><td><code>--vs-c1</code></td><td><span style="background-color: #94376B; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#94376B</span></td><td><span style="background-color: #BF5390; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#BF5390</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ワイン）</td><td><code>--vs-c2</code></td><td><span style="background-color: #642430; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#642430</span></td><td><span style="background-color: #C25569; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#C25569</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・杏）</td><td><code>--vs-c3</code></td><td><span style="background-color: #C38328; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#C38328</span></td><td><span style="background-color: #FDD59C; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#FDD59C</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ピンク）</td><td><code>--vs-c4</code></td><td><span style="background-color: #CA749F; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#CA749F</span></td><td><span style="background-color: #F2BCD7; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#F2BCD7</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFF9F0; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#FFF9F0</span></td><td><span style="background-color: #14070C; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#14070C</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FEF0DC; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#FEF0DC</span></td><td><span style="background-color: #1E0B13; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#1E0B13</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFF9F0; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #947C7C;">#947C7C</span></td><td><span style="background-color: #14070C; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6D5D56;">#6D5D56</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFF9F0; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#3C161D</span></td><td><span style="background-color: #14070C; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#FEEACE</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #FDD59C; color: #3C161D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947C7C;">#FDD59C</span></td><td><span style="background-color: #FDD59C; color: #FEEACE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D5D56;">#FDD59C</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
