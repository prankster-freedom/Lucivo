# 49. 絵の中の庭（Painted Garden）

- **ID**: `painted-garden`
- **トーン区分**: うすい＋やわらかい（pale + soft）
- **配色技法**: 色相配色（淡いライムとコーラルピンクの補色寄りの対比）
- **基にした配色**: `#F3AC94`（コーラル）、`#F8C6CE`（ピンク）、`#E2E1AB`（ライム）、`#FEECD9`（クリーム）
- **印象・用途**: 古い絵画の中の庭。夢見がちでやさしい、物語・絵本の話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・コーラル）</td><td><code>--vs-c1</code></td><td><span style="background-color: #E2704A; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#E2704A</span></td><td><span style="background-color: #F3AC94; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#F3AC94</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ピンク）</td><td><code>--vs-c2</code></td><td><span style="background-color: #CC7C89; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#CC7C89</span></td><td><span style="background-color: #F8C6CE; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#F8C6CE</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ライム）</td><td><code>--vs-c3</code></td><td><span style="background-color: #97953F; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#97953F</span></td><td><span style="background-color: #E2E1AB; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#E2E1AB</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・クリーム）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B38C62; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#B38C62</span></td><td><span style="background-color: #FEECD9; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#FEECD9</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFFCF9; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#FFFCF9</span></td><td><span style="background-color: #271C18; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#271C18</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FFF8F2; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#FFF8F2</span></td><td><span style="background-color: #3A2924; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#3A2924</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFFCF9; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A0918C;">#A0918C</span></td><td><span style="background-color: #271C18; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #796F69;">#796F69</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFFCF9; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#533A32</span></td><td><span style="background-color: #271C18; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#FFF6EC</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F3AC94; color: #533A32; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A0918C;">#F3AC94</span></td><td><span style="background-color: #F3AC94; color: #FFF6EC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #796F69;">#F3AC94</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
