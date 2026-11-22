# 187. モダンなポスター（Modern Poster）

- **ID**: `modern-poster`
- **トーン区分**: つよい＋くらい（strong + dark）
- **配色技法**: 色相配色（オレンジと青の補色を、暗い紫で引き締め、青白を地にする）
- **基にした配色**: `#F18448`（オレンジ）、`#6AAADE`（ブルー）、`#5B5579`（紫）、`#E9EFF4`（青白）
- **印象・用途**: 現代的なポスター。明快でトレンド感のある、告知・ブランド向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オレンジ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #E55D12; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#E55D12</span></td><td><span style="background-color: #F18448; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#F18448</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ブルー）</td><td><code>--vs-c2</code></td><td><span style="background-color: #388DD3; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#388DD3</span></td><td><span style="background-color: #6AAADE; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#6AAADE</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・紫）</td><td><code>--vs-c3</code></td><td><span style="background-color: #5B5579; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#5B5579</span></td><td><span style="background-color: #8079A1; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#8079A1</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・オレンジの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #953C0B; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#953C0B</span></td><td><span style="background-color: #F7BB9A; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#F7BB9A</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #E9EFF4; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#E9EFF4</span></td><td><span style="background-color: #1B1110; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#1B1110</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EAE6E6; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#EAE6E6</span></td><td><span style="background-color: #281A17; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#281A17</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #E9EFF4; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #878896;">#878896</span></td><td><span style="background-color: #1B1110; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6D6869;">#6D6869</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #E9EFF4; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#373349</span></td><td><span style="background-color: #1B1110; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#F4F7FA</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F18448; color: #373349; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878896;">#F18448</span></td><td><span style="background-color: #F18448; color: #F4F7FA; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6D6869;">#F18448</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
