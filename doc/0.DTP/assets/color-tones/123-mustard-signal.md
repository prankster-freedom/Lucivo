# 123. マスタードと赤（Mustard Signal）

- **ID**: `mustard-signal`
- **トーン区分**: つよい（strong）
- **配色技法**: 色相配色（黄と赤の類似色相を、淡い青灰で落ち着かせる）
- **基にした配色**: `#EFBB3F`（イエロー）、`#BF4718`（赤）、`#E1E7EE`（淡い青灰）
- **印象・用途**: 古い道路標識。目を引き、はっきりした、案内・注意喚起向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・赤）</td><td><code>--vs-c1</code></td><td><span style="background-color: #BF4718; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#BF4718</span></td><td><span style="background-color: #D64F1B; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#D64F1B</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・イエロー）</td><td><code>--vs-c2</code></td><td><span style="background-color: #B9870F; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#B9870F</span></td><td><span style="background-color: #EFBB3F; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#EFBB3F</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・淡い青灰）</td><td><code>--vs-c3</code></td><td><span style="background-color: #7994B3; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#7994B3</span></td><td><span style="background-color: #E1E7EE; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#E1E7EE</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・赤の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #A43D15; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#A43D15</span></td><td><span style="background-color: #DC9A80; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#DC9A80</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FBFBFC; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#FBFBFC</span></td><td><span style="background-color: #1F0B04; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#1F0B04</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F5F7F9; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#F5F7F9</span></td><td><span style="background-color: #2E1106; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#2E1106</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FBFBFC; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #AD8879;">#AD8879</span></td><td><span style="background-color: #1F0B04; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6E6360;">#6E6360</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FBFBFC; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#6E290D</span></td><td><span style="background-color: #1F0B04; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#F0F3F7</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EFBB3F; color: #6E290D; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AD8879;">#EFBB3F</span></td><td><span style="background-color: #EFBB3F; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6360;">#EFBB3F</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
