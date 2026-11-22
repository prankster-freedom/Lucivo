# 02. 春霞のさくら（Spring Mist）

- **ID**: `spring-mist`
- **トーン区分**: うすい（pale）
- **配色技法**: カマイユ／ドミナント・トーン（高明度・低彩度の淡い余白）
- **印象・用途**: 白い紙面にほのかに色が滲むような繊細さ。エッセイ・世界観紹介・余白重視の誌面向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・桜）</td><td><code>--vs-c1</code></td><td><span style="background-color: #F2D7DA; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#F2D7DA<br><small>文字 #2B2528</small></span></td><td><span style="background-color: #E8BCC2; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#E8BCC2<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・白茶）</td><td><code>--vs-c2</code></td><td><span style="background-color: #F4ECD2; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#F4ECD2<br><small>文字 #2B2528</small></span></td><td><span style="background-color: #E6DBB5; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#E6DBB5<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・若葉）</td><td><code>--vs-c3</code></td><td><span style="background-color: #D9EADC; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#D9EADC<br><small>文字 #2B2528</small></span></td><td><span style="background-color: #BCE0C3; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#BCE0C3<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・薄空）</td><td><code>--vs-c4</code></td><td><span style="background-color: #D8E2F0; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#D8E2F0<br><small>文字 #2B2528</small></span></td><td><span style="background-color: #BCCCE6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#BCCCE6<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFFCFC; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#FFFCFC<br><small>文字 #2B2528</small></span></td><td><span style="background-color: #17151A; color: #F8F4F5; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#17151A<br><small>文字 #F8F4F5</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FAF7F7; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#FAF7F7<br><small>文字 #2B2528</small></span></td><td><span style="background-color: #221F26; color: #F8F4F5; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#221F26<br><small>文字 #F8F4F5</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFFCFC; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8E7F84;">#8E7F84</span></td><td><span style="background-color: #17151A; color: #F8F4F5; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #B0A2A7;">#B0A2A7</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFFCFC; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#2B2528</span></td><td><span style="background-color: #17151A; color: #F8F4F5; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#F8F4F5</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F4B8C4; color: #2B2528; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E7F84;">#F4B8C4<br><small>文字 #2B2528</small></span></td><td><span style="background-color: #F9D5DC; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #B0A2A7;">#F9D5DC<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
