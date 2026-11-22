# 65. ペリウィンクルとモーブ（Periwinkle Mauve）

- **ID**: `periwinkle-mauve`
- **トーン区分**: ごくうすい＋あかるいはいみ（very pale + light grayish）
- **配色技法**: ドミナント・トーン（青紫と赤紫の近い色相を、淡いトーンでまとめる）
- **基にした配色**: `#B6A2B5`（モーブ）、`#DDE4F5`（ペリウィンクル）、`#FDEADF`（白）
- **印象・用途**: 夜明け前の空。静かで上品な、案内・お知らせ向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・モーブ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #9B809A; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#9B809A</span></td><td><span style="background-color: #B6A2B5; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#B6A2B5</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ペリウィンクル）</td><td><code>--vs-c2</code></td><td><span style="background-color: #7388BC; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#7388BC</span></td><td><span style="background-color: #DDE4F5; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#DDE4F5</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・モーブの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #685267; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#685267</span></td><td><span style="background-color: #D7CCD6; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#D7CCD6</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ペリウィンクルの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #415688; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#415688</span></td><td><span style="background-color: #ECF0FA; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#ECF0FA</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEADF; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#FDEADF</span></td><td><span style="background-color: #1D1A1D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#1D1A1D</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F7E4DC; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#F7E4DC</span></td><td><span style="background-color: #2C272B; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#2C272B</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEADF; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #938785;">#938785</span></td><td><span style="background-color: #1D1A1D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #736D6D;">#736D6D</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEADF; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#3C363C</span></td><td><span style="background-color: #1D1A1D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#FEF5EF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #FDEADF; color: #3C363C; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #938785;">#FDEADF</span></td><td><span style="background-color: #FDEADF; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #736D6D;">#FDEADF</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
