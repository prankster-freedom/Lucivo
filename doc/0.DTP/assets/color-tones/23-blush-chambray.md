# 23. 頬紅とシャンブレー（Blush Chambray）

- **ID**: `blush-chambray`
- **トーン区分**: うすい＋あかるいはいみ（pale + light grayish）
- **配色技法**: カマイユ／ドミナント・トーン（淡いピンク・クリーム・ローズベージュ・ラベンダーグレーを、近いトーンでまとめる）
- **基にした配色**: `#FBD3C5`（ピンク）、`#FBEFE1`（クリーム）、`#D4B6A4`（ローズベージュ）、`#D5D6D9`（ラベンダーグレー）
- **印象・用途**: 洗いざらしのシャツと頬紅。やさしく上品な、ファッション・ライフスタイルの紹介向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ローズベージュ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #B88E78; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#B88E78</span></td><td><span style="background-color: #D4B6A4; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#D4B6A4</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ピンク）</td><td><code>--vs-c2</code></td><td><span style="background-color: #E8A994; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#E8A994</span></td><td><span style="background-color: #FBD3C5; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#FBD3C5</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ラベンダーグレー）</td><td><code>--vs-c3</code></td><td><span style="background-color: #9FA1AD; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#9FA1AD</span></td><td><span style="background-color: #D5D6D9; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#D5D6D9</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・モーブ）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B7A2B8; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#B7A2B8</span></td><td><span style="background-color: #E3CFE0; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#E3CFE0</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FBEFE1; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#FBEFE1</span></td><td><span style="background-color: #2B2427; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#2B2427</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F8E8DD; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#F8E8DD</span></td><td><span style="background-color: #3A3135; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#3A3135</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FBEFE1; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A08C82;">#A08C82</span></td><td><span style="background-color: #2B2427; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #77666B;">#77666B</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FBEFE1; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#4A3A35</span></td><td><span style="background-color: #2B2427; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#FBEFE1</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #FBD3C5; color: #4A3A35; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A08C82;">#FBD3C5</span></td><td><span style="background-color: #FBD3C5; color: #FBEFE1; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #77666B;">#FBD3C5</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
