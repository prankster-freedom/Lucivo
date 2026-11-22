# 192. 杏と真夜中（Apricot Midnight）

- **ID**: `apricot-midnight`
- **トーン区分**: あかるい＋くらい（bright + dark）
- **配色技法**: 色相配色（杏色と暗い紺の補色の 2 色）
- **基にした配色**: `#FBC47D`（杏）、`#114253`（紺）
- **印象・用途**: 古い映画のポスター。懐かしく印象的な、カルチャー・告知向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・杏）</td><td><code>--vs-c1</code></td><td><span style="background-color: #D27A08; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#D27A08</span></td><td><span style="background-color: #FBC47D; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#FBC47D</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・紺）</td><td><code>--vs-c2</code></td><td><span style="background-color: #114253; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#114253</span></td><td><span style="background-color: #2389AC; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#2389AC</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・杏の濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #894F04; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#894F04</span></td><td><span style="background-color: #FDDFB8; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#FDDFB8</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・紺の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #114253; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#114253</span></td><td><span style="background-color: #7C97A0; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#7C97A0</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FEF6EC; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#FEF6EC</span></td><td><span style="background-color: #151511; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#151511</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FEEAD2; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#FEEAD2</span></td><td><span style="background-color: #201F19; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#201F19</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FEF6EC; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #788586;">#788586</span></td><td><span style="background-color: #151511; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6D6353;">#6D6353</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FEF6EC; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#0A2832</span></td><td><span style="background-color: #151511; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#FDE2BE</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #FBC47D; color: #0A2832; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #788586;">#FBC47D</span></td><td><span style="background-color: #FBC47D; color: #FDE2BE; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6353;">#FBC47D</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
