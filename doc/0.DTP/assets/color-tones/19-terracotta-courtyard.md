# 19. テラコッタの中庭（Terracotta Courtyard）

- **ID**: `terracotta-courtyard`
- **トーン区分**: やわらかい〜にぶい（soft / dull）
- **配色技法**: ウォームシェード（素焼き・砂壁・オリーブの温かな南欧調）
- **印象・用途**: 手触りのある土と日光の安心感。コミュニティ紹介・編集方針・デザインガイド向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・素焼）</td><td><code>--vs-c1</code></td><td><span style="background-color: #D46A52; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#D46A52<br><small>文字 #2A1F1A</small></span></td><td><span style="background-color: #E48670; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#E48670<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・黄土）</td><td><code>--vs-c2</code></td><td><span style="background-color: #D69F4E; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#D69F4E<br><small>文字 #2A1F1A</small></span></td><td><span style="background-color: #E6B56A; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#E6B56A<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・橄欖）</td><td><code>--vs-c3</code></td><td><span style="background-color: #839760; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#839760<br><small>文字 #2A1F1A</small></span></td><td><span style="background-color: #9EB37B; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#9EB37B<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・砂岩）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B89F8D; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#B89F8D<br><small>文字 #2A1F1A</small></span></td><td><span style="background-color: #CBB5A6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#CBB5A6<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FCF9F5; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#FCF9F5<br><small>文字 #2A1F1A</small></span></td><td><span style="background-color: #1B1512; color: #F7F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#1B1512<br><small>文字 #F7F1EB</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F5EFE8; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#F5EFE8<br><small>文字 #2A1F1A</small></span></td><td><span style="background-color: #261E1A; color: #F7F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#261E1A<br><small>文字 #F7F1EB</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FCF9F5; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6E5B50;">#6E5B50</span></td><td><span style="background-color: #1B1512; color: #F7F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A38F83;">#A38F83</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FCF9F5; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#2A1F1A</span></td><td><span style="background-color: #1B1512; color: #F7F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#F7F1EB</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EA6A47; color: #2A1F1A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E5B50;">#EA6A47<br><small>文字 #2A1F1A</small></span></td><td><span style="background-color: #FF9D80; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38F83;">#FF9D80<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
