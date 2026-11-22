# 148. パーティーの紙吹雪（Party Confetti）

- **ID**: `party-confetti`
- **トーン区分**: さえた＋うすい（vivid + pale）
- **配色技法**: 色相配色（コーラルとマゼンタの暖色に、ペリウィンクルを合わせる）
- **基にした配色**: `#EC644E`（コーラル）、`#CF388D`（マゼンタ）、`#9ABAE3`（ペリウィンクル）、`#E7F3EA`（ミントホワイト）
- **印象・用途**: 舞い上がる紙吹雪。華やかで楽しい、お祝い・フェス向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・マゼンタ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #CF388D; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#CF388D</span></td><td><span style="background-color: #D34896; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#D34896</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・コーラル）</td><td><code>--vs-c2</code></td><td><span style="background-color: #EB5840; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#EB5840</span></td><td><span style="background-color: #EC644E; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#EC644E</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ペリウィンクル）</td><td><code>--vs-c3</code></td><td><span style="background-color: #598CCE; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#598CCE</span></td><td><span style="background-color: #9ABAE3; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#9ABAE3</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・マゼンタの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #9E266A; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#9E266A</span></td><td><span style="background-color: #E592C0; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#E592C0</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #E7F3EA; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#E7F3EA</span></td><td><span style="background-color: #210917; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#210917</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #E5E4E3; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#E5E4E3</span></td><td><span style="background-color: #320D22; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#320D22</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #E7F3EA; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9F7C8F;">#9F7C8F</span></td><td><span style="background-color: #210917; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #71646B;">#71646B</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #E7F3EA; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#641B45</span></td><td><span style="background-color: #210917; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#F3F9F5</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EC644E; color: #641B45; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9F7C8F;">#EC644E</span></td><td><span style="background-color: #EC644E; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71646B;">#EC644E</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
