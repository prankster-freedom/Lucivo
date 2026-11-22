# 42. 赤煉瓦と冬の空（Brick Skyline）

- **ID**: `brick-skyline`
- **トーン区分**: こい＋うすい（deep + pale）
- **配色技法**: 色相配色（赤の濃淡に、反対色相の淡い水色を合わせる）
- **基にした配色**: `#931A1E`（マルーン）、`#EC644E`（コーラル）、`#B6DFE9`（水色）
- **印象・用途**: 冬の澄んだ空と煉瓦の街並み。温かく誠実な、地域・歴史の紹介向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・コーラル）</td><td><code>--vs-c1</code></td><td><span style="background-color: #EC644E; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#EC644E</span></td><td><span style="background-color: #EC644E; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#EC644E</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・マルーン）</td><td><code>--vs-c2</code></td><td><span style="background-color: #931A1E; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#931A1E</span></td><td><span style="background-color: #DE4449; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#DE4449</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・水色）</td><td><code>--vs-c3</code></td><td><span style="background-color: #5299AA; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#5299AA</span></td><td><span style="background-color: #B6DFE9; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#B6DFE9</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・コーラルの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B22913; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#B22913</span></td><td><span style="background-color: #F5AA9E; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#F5AA9E</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F4FAFC; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#F4FAFC</span></td><td><span style="background-color: #1F0A09; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#1F0A09</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #E5F4F7; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#E5F4F7</span></td><td><span style="background-color: #2E0F0D; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#2E0F0D</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F4FAFC; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9E797B;">#9E797B</span></td><td><span style="background-color: #1F0A09; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #666162;">#666162</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F4FAFC; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#581012</span></td><td><span style="background-color: #1F0A09; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#DBEFF4</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EC644E; color: #581012; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E797B;">#EC644E</span></td><td><span style="background-color: #EC644E; color: #DBEFF4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #666162;">#EC644E</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
