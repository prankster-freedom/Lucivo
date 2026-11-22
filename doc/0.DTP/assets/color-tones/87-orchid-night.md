# 87. 夜の蘭（Orchid Night）

- **ID**: `orchid-night`
- **トーン区分**: やわらかい＋くらい（soft + dark）
- **配色技法**: トーン・オン・トーン（紫の色相で、明度を大きく変える）
- **基にした配色**: `#CE88BA`（オーキッド）、`#412B59`（深紫）
- **印象・用途**: 夜に咲く蘭。艶やかで神秘的な、美容・音楽向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オーキッド）</td><td><code>--vs-c1</code></td><td><span style="background-color: #C26BA9; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#C26BA9</span></td><td><span style="background-color: #CE88BA; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#CE88BA</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・深紫）</td><td><code>--vs-c2</code></td><td><span style="background-color: #412B59; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#412B59</span></td><td><span style="background-color: #926EB9; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#926EB9</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・オーキッドの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #8D3A75; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#8D3A75</span></td><td><span style="background-color: #E4BED9; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#E4BED9</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・深紫の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #412B59; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#412B59</span></td><td><span style="background-color: #978AA4; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#978AA4</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F8EDF5; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#F8EDF5</span></td><td><span style="background-color: #160E16; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#160E16</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EED5E7; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#EED5E7</span></td><td><span style="background-color: #211621; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#211621</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F8EDF5; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #85798B;">#85798B</span></td><td><span style="background-color: #160E16; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #655362;">#655362</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F8EDF5; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#271A35</span></td><td><span style="background-color: #160E16; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#E7C4DD</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #CE88BA; color: #271A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #85798B;">#CE88BA</span></td><td><span style="background-color: #CE88BA; color: #E7C4DD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #655362;">#CE88BA</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
