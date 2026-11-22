# 188. 懐かしい果樹園（Nostalgic Orchard）

- **ID**: `nostalgic-orchard`
- **トーン区分**: うすい＋にぶい（pale + dull）
- **配色技法**: 色相配色（淡い若草とサーモンの対比を、煉瓦色で締める）
- **基にした配色**: `#B3694A`（煉瓦）、`#F8BEA2`（サーモン）、`#D7E6B5`（若草）、`#FDEADF`（白）
- **印象・用途**: 子どもの頃の庭。懐かしく温かな、思い出・地域の話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・煉瓦）</td><td><code>--vs-c1</code></td><td><span style="background-color: #B3694A; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#B3694A</span></td><td><span style="background-color: #B56C4D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#B56C4D</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・サーモン）</td><td><code>--vs-c2</code></td><td><span style="background-color: #CD7043; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#CD7043</span></td><td><span style="background-color: #F8BEA2; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#F8BEA2</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・若草）</td><td><code>--vs-c3</code></td><td><span style="background-color: #799143; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#799143</span></td><td><span style="background-color: #D7E6B5; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#D7E6B5</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・煉瓦の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #804B35; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#804B35</span></td><td><span style="background-color: #D5AD9B; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#D5AD9B</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEADF; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#FDEADF</span></td><td><span style="background-color: #1D110C; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#1D110C</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F7E0D3; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#F7E0D3</span></td><td><span style="background-color: #2B1912; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#2B1912</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEADF; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9D8376;">#9D8376</span></td><td><span style="background-color: #1D110C; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #736862;">#736862</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEADF; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#4E2E20</span></td><td><span style="background-color: #1D110C; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#FEF5EF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F8BEA2; color: #4E2E20; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8376;">#F8BEA2</span></td><td><span style="background-color: #F8BEA2; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736862;">#F8BEA2</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
