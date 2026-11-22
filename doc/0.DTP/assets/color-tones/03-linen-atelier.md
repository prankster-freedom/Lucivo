# 03. 生成りのアトリエ（Linen Atelier）

- **ID**: `linen-atelier`
- **トーン区分**: あかるいはいみ（light grayish）
- **配色技法**: トーン・オン・トーン（無彩色寄りの穏やかな明度差）
- **印象・用途**: 麻布や上質紙のような落ち着いた知的さ。デザイン仕様書・建築・クラフト解説向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・灰桜）</td><td><code>--vs-c1</code></td><td><span style="background-color: #D2B9BC; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#D2B9BC<br><small>文字 #262523</small></span></td><td><span style="background-color: #D9C3C6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#D9C3C6<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・生成）</td><td><code>--vs-c2</code></td><td><span style="background-color: #D6CEB6; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#D6CEB6<br><small>文字 #262523</small></span></td><td><span style="background-color: #DDD6C0; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#DDD6C0<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・青磁）</td><td><code>--vs-c3</code></td><td><span style="background-color: #B9C9BD; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#B9C9BD<br><small>文字 #262523</small></span></td><td><span style="background-color: #C4D4C8; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#C4D4C8<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・藍鼠）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B7C0CF; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#B7C0CF<br><small>文字 #262523</small></span></td><td><span style="background-color: #C3CCD9; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#C3CCD9<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FAF9F6; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#FAF9F6<br><small>文字 #262523</small></span></td><td><span style="background-color: #18191C; color: #F4F2EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#18191C<br><small>文字 #F4F2EE</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F3F1EC; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#F3F1EC<br><small>文字 #262523</small></span></td><td><span style="background-color: #23252A; color: #F4F2EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#23252A<br><small>文字 #F4F2EE</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FAF9F6; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6F6E6A;">#6F6E6A</span></td><td><span style="background-color: #18191C; color: #F4F2EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9E9C96;">#9E9C96</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FAF9F6; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#262523</span></td><td><span style="background-color: #18191C; color: #F4F2EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#F4F2EE</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #C9B8A3; color: #262523; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6F6E6A;">#C9B8A3<br><small>文字 #262523</small></span></td><td><span style="background-color: #E3D5C3; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9E9C96;">#E3D5C3<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
