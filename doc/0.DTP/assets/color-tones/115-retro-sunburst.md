# 115. レトロな夕陽（Retro Sunburst）

- **ID**: `retro-sunburst`
- **トーン区分**: つよい＋くらい（strong + dark）
- **配色技法**: 色相配色（マスタードとオレンジの暖色を、深い紺紫で引き締める）
- **基にした配色**: `#DF6511`（オレンジ）、`#E9A431`（マスタード）、`#1E144B`（紺紫）、`#F9E9D1`（クリーム）
- **印象・用途**: 70 年代のポスター。元気でレトロな、カルチャー・イベント向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オレンジ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #DF6511; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#DF6511</span></td><td><span style="background-color: #DF6511; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#DF6511</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・マスタード）</td><td><code>--vs-c2</code></td><td><span style="background-color: #C78515; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#C78515</span></td><td><span style="background-color: #E9A431; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#E9A431</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・紺紫）</td><td><code>--vs-c3</code></td><td><span style="background-color: #1E144B; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#1E144B</span></td><td><span style="background-color: #7D69D7; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#7D69D7</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・クリーム）</td><td><code>--vs-c4</code></td><td><span style="background-color: #AF8D59; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#AF8D59</span></td><td><span style="background-color: #F9E9D1; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#F9E9D1</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FEFCF8; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#FEFCF8</span></td><td><span style="background-color: #140A07; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#140A07</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FDF7EF; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#FDF7EF</span></td><td><span style="background-color: #1E0F0B; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#1E0F0B</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FEFCF8; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7C7888;">#7C7888</span></td><td><span style="background-color: #140A07; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6C635D;">#6C635D</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FEFCF8; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#120C2D</span></td><td><span style="background-color: #140A07; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#FCF4E8</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #DF6511; color: #120C2D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7888;">#DF6511</span></td><td><span style="background-color: #DF6511; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C635D;">#DF6511</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
