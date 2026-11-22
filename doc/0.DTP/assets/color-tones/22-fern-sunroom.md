# 22. 観葉植物の陽だまり（Fern Sunroom）

- **ID**: `fern-sunroom`
- **トーン区分**: うすい＋にぶい（pale + dull）
- **配色技法**: ナチュラルハーモニー（明るい側を黄みのピーチ、暗い側を青みのティールにする）
- **基にした配色**: `#F4D9CB`（ピーチ）、`#F1F1F3`（明るいグレー）、`#B2BB9E`（セージ）、`#799797`（ティールグレー）
- **印象・用途**: 光の入る部屋と観葉植物。やわらかく親しみやすい、暮らし・ウェルビーイングの話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ティール）</td><td><code>--vs-c1</code></td><td><span style="background-color: #799797; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#799797</span></td><td><span style="background-color: #9CBDBD; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#9CBDBD</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・セージ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #8E9A72; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#8E9A72</span></td><td><span style="background-color: #B2BB9E; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#B2BB9E</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ピーチ）</td><td><code>--vs-c3</code></td><td><span style="background-color: #E0A88E; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#E0A88E</span></td><td><span style="background-color: #F4D9CB; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#F4D9CB</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・素焼き）</td><td><code>--vs-c4</code></td><td><span style="background-color: #9C8A80; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#9C8A80</span></td><td><span style="background-color: #D1C4BA; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#D1C4BA</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F1F1F3; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#F1F1F3</span></td><td><span style="background-color: #1E2627; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#1E2627</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F8ECE5; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#F8ECE5</span></td><td><span style="background-color: #2A3435; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#2A3435</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F1F1F3; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7E8A8A;">#7E8A8A</span></td><td><span style="background-color: #1E2627; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #5F6E6E;">#5F6E6E</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F1F1F3; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#2B3536</span></td><td><span style="background-color: #1E2627; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#F1F1F3</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F4D9CB; color: #2B3536; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7E8A8A;">#F4D9CB</span></td><td><span style="background-color: #FBE6DA; color: #F1F1F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #5F6E6E;">#FBE6DA</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
