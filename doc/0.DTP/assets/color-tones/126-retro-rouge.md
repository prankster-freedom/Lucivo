# 126. レトロなルージュ（Retro Rouge）

- **ID**: `retro-rouge`
- **トーン区分**: つよい＋くらい（strong + dark）
- **配色技法**: ドミナント・カラー（朱からバーガンディの赤系でそろえ、ピンクとクリームを添える）
- **基にした配色**: `#D15E2D`（朱）、`#7C1622`（バーガンディ）、`#F6CFDD`（ピンク）、`#F9E9D1`（クリーム）
- **印象・用途**: 昔の化粧品の箱。華やかでノスタルジックな、コスメ・ファッション向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・朱）</td><td><code>--vs-c1</code></td><td><span style="background-color: #D15E2D; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#D15E2D</span></td><td><span style="background-color: #D15E2D; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#D15E2D</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・バーガンディ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #7C1622; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#7C1622</span></td><td><span style="background-color: #DD3F51; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#DD3F51</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ピンク）</td><td><code>--vs-c3</code></td><td><span style="background-color: #C17F97; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#C17F97</span></td><td><span style="background-color: #F6CFDD; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#F6CFDD</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・クリーム）</td><td><code>--vs-c4</code></td><td><span style="background-color: #AF8D59; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#AF8D59</span></td><td><span style="background-color: #F9E9D1; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#F9E9D1</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FEFCF8; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#FEFCF8</span></td><td><span style="background-color: #1B0906; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#1B0906</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FDF7EF; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#FDF7EF</span></td><td><span style="background-color: #280E0A; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#280E0A</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FEFCF8; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9B797B;">#9B797B</span></td><td><span style="background-color: #1B0906; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #71625C;">#71625C</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FEFCF8; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#4A0D14</span></td><td><span style="background-color: #1B0906; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#FCF4E8</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F9E9D1; color: #4A0D14; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B797B;">#F9E9D1</span></td><td><span style="background-color: #F9E9D1; color: #FCF4E8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #71625C;">#F9E9D1</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
