# 184. スレートとコーラル（Slate Coral）

- **ID**: `slate-coral`
- **トーン区分**: にぶい＋つよい（dull + strong）
- **配色技法**: 色相配色（灰みの青とコーラルの補色を、淡い白でつなぐ）
- **基にした配色**: `#8598B7`（スレートブルー）、`#EF7B51`（コーラル）、`#FDEADF`（白）
- **印象・用途**: 港の夕方。落ち着きと温かさのある、ビジネス・報告向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・コーラル）</td><td><code>--vs-c1</code></td><td><span style="background-color: #EB5822; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#EB5822</span></td><td><span style="background-color: #EF7B51; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#EF7B51</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・スレートブルー）</td><td><code>--vs-c2</code></td><td><span style="background-color: #758AAE; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#758AAE</span></td><td><span style="background-color: #8598B7; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#8598B7</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・コーラルの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #9E350E; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#9E350E</span></td><td><span style="background-color: #F6B69F; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#F6B69F</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・スレートブルーの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #465877; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#465877</span></td><td><span style="background-color: #BCC6D7; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#BCC6D7</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEADF; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#FDEADF</span></td><td><span style="background-color: #1E1615; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#1E1615</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FCE1D4; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#FCE1D4</span></td><td><span style="background-color: #2D2120; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#2D2120</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEADF; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8C8789;">#8C8789</span></td><td><span style="background-color: #1E1615; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #736B68;">#736B68</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEADF; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#303642</span></td><td><span style="background-color: #1E1615; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#FEF5EF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EF7B51; color: #303642; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8789;">#EF7B51</span></td><td><span style="background-color: #EF7B51; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736B68;">#EF7B51</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
