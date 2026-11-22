# 110. 薔薇のキャンディ（Rose Candy）

- **ID**: `rose-candy`
- **トーン区分**: さえた＋ごくうすい（vivid + very pale）
- **配色技法**: ドミナント・カラー（ピンクからローズの色相でそろえ、明度で変化をつける）
- **基にした配色**: `#D65A9C`（ピンク）、`#EA4E78`（ローズ）、`#F7BFC5`（淡いピンク）、`#FDEAE3`（白）
- **印象・用途**: 薔薇色のキャンディ。甘く元気な、ギフト・イベント向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ローズ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #EA4E78; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#EA4E78</span></td><td><span style="background-color: #EA4E78; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#EA4E78</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ピンク）</td><td><code>--vs-c2</code></td><td><span style="background-color: #D65A9C; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#D65A9C</span></td><td><span style="background-color: #D65A9C; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#D65A9C</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・淡いピンク）</td><td><code>--vs-c3</code></td><td><span style="background-color: #C86E78; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#C86E78</span></td><td><span style="background-color: #F7BFC5; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#F7BFC5</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ローズの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #AE153E; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#AE153E</span></td><td><span style="background-color: #F39EB5; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#F39EB5</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEAE3; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#FDEAE3</span></td><td><span style="background-color: #240D16; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#240D16</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FBDEDA; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#FBDEDA</span></td><td><span style="background-color: #361421; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#361421</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEAE3; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A37E8A;">#A37E8A</span></td><td><span style="background-color: #240D16; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #776569;">#776569</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEAE3; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#592541</span></td><td><span style="background-color: #240D16; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#FEF5F1</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F7BFC5; color: #592541; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A37E8A;">#F7BFC5</span></td><td><span style="background-color: #F7BFC5; color: #FEF5F1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #776569;">#F7BFC5</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
