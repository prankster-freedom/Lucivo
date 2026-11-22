# 129. 抽象画のキャンバス（Abstract Canvas）

- **ID**: `abstract-canvas`
- **トーン区分**: やわらかい＋くらい（soft + dark）
- **配色技法**: 色相配色（ダスティピンクと紺の補色寄りの対比を、トープでなじませる）
- **基にした配色**: `#354458`（紺）、`#E5AD9C`（ダスティピンク）、`#A8917B`（トープ）、`#FDEADF`（白）
- **印象・用途**: 油彩の抽象画。情感と深みのある、アート・作品紹介向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ダスティピンク）</td><td><code>--vs-c1</code></td><td><span style="background-color: #C86E53; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#C86E53</span></td><td><span style="background-color: #E5AD9C; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#E5AD9C</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・紺）</td><td><code>--vs-c2</code></td><td><span style="background-color: #354458; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#354458</span></td><td><span style="background-color: #6882A4; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#6882A4</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・トープ）</td><td><code>--vs-c3</code></td><td><span style="background-color: #9E846C; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#9E846C</span></td><td><span style="background-color: #A8917B; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#A8917B</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ダスティピンクの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #8F3E26; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#8F3E26</span></td><td><span style="background-color: #F1D2C9; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#F1D2C9</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEADF; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#FDEADF</span></td><td><span style="background-color: #171314; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#171314</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FBE5DA; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#FBE5DA</span></td><td><span style="background-color: #221D1D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#221D1D</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEADF; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #838082;">#838082</span></td><td><span style="background-color: #171314; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6F6967;">#6F6967</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEADF; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#202935</span></td><td><span style="background-color: #171314; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#FEF5EF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #E5AD9C; color: #202935; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #838082;">#E5AD9C</span></td><td><span style="background-color: #E5AD9C; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6967;">#E5AD9C</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
