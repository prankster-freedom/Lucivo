# 176. 原色のスケッチ（Primary Sketch）

- **ID**: `primary-sketch`
- **トーン区分**: さえた＋くらい（vivid + dark）
- **配色技法**: 色相配色（黄・赤・青の原色を、暗い紫で締める）
- **基にした配色**: `#EFE108`（イエロー）、`#EC613F`（レッド）、`#6AAADE`（ブルー）、`#5B5579`（紫）
- **印象・用途**: 水彩の人物スケッチ。トレンド感のある、カルチャー・ファッション向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・イエロー）</td><td><code>--vs-c1</code></td><td><span style="background-color: #9B9205; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#9B9205</span></td><td><span style="background-color: #EFE108; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#EFE108</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・レッド）</td><td><code>--vs-c2</code></td><td><span style="background-color: #EC613F; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#EC613F</span></td><td><span style="background-color: #EC613F; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#EC613F</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ブルー）</td><td><code>--vs-c3</code></td><td><span style="background-color: #4495D6; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#4495D6</span></td><td><span style="background-color: #6AAADE; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#6AAADE</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・紫）</td><td><code>--vs-c4</code></td><td><span style="background-color: #5B5579; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#5B5579</span></td><td><span style="background-color: #837CA3; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#837CA3</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDFBDA; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#FDFBDA</span></td><td><span style="background-color: #1A190A; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#1A190A</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F9F5A9; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#F9F5A9</span></td><td><span style="background-color: #282510; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#282510</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDFBDA; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #908D8A;">#908D8A</span></td><td><span style="background-color: #1A190A; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6E6B38;">#6E6B38</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDFBDA; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#373349</span></td><td><span style="background-color: #1A190A; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#F7F084</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EFE108; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #908D8A;">#EFE108</span></td><td><span style="background-color: #EFE108; color: #F7F084; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6B38;">#EFE108</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
