# 125. 夕焼けと霧（Sunset Mist）

- **ID**: `sunset-mist`
- **トーン区分**: つよい＋ごくうすい（strong + very pale）
- **配色技法**: ドミナント・カラー（橙から朱の色相でそろえ、淡い青灰を地にする）
- **基にした配色**: `#F5A04E`（オレンジ）、`#D15E2D`（朱）、`#E1E7EE`（淡い青灰）
- **印象・用途**: 霧の向こうの夕焼け。温かく印象的な、旅行・物語向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・朱）</td><td><code>--vs-c1</code></td><td><span style="background-color: #D15E2D; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#D15E2D</span></td><td><span style="background-color: #D15E2D; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#D15E2D</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・オレンジ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #E0740D; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#E0740D</span></td><td><span style="background-color: #F5A04E; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#F5A04E</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・淡い青灰）</td><td><code>--vs-c3</code></td><td><span style="background-color: #7994B3; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#7994B3</span></td><td><span style="background-color: #E1E7EE; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#E1E7EE</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・朱の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #9A4521; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#9A4521</span></td><td><span style="background-color: #E6A68C; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#E6A68C</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FBFBFC; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#FBFBFC</span></td><td><span style="background-color: #210F07; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#210F07</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F5F7F9; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#F5F7F9</span></td><td><span style="background-color: #32170B; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#32170B</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FBFBFC; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #AA8B7E;">#AA8B7E</span></td><td><span style="background-color: #210F07; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #706662;">#706662</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FBFBFC; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#682F16</span></td><td><span style="background-color: #210F07; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#F0F3F7</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F5A04E; color: #682F16; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #AA8B7E;">#F5A04E</span></td><td><span style="background-color: #F5A04E; color: #F0F3F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #706662;">#F5A04E</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
