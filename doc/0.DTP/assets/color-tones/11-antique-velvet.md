# 11. 深紅と紺青の舞台幕（Antique Velvet）

- **ID**: `antique-velvet`
- **トーン区分**: こい（deep）
- **配色技法**: アクセントカラー（重厚な深色と金の引き締め）
- **印象・用途**: クラシックな劇場や高級感のある格式。基調講演・年次総括・ブランドストーリー向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・深紅）</td><td><code>--vs-c1</code></td><td><span style="background-color: #9A1028; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#9A1028<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #D13B55; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#D13B55<br><small>文字 #F8FAFC</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・黄土）</td><td><code>--vs-c2</code></td><td><span style="background-color: #A07C00; color: #1C1518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#A07C00<br><small>文字 #1C1518</small></span></td><td><span style="background-color: #D4AC2B; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#D4AC2B<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・深翠）</td><td><code>--vs-c3</code></td><td><span style="background-color: #0A7030; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#0A7030<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #2FA65B; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#2FA65B<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・濃藍）</td><td><code>--vs-c4</code></td><td><span style="background-color: #0A3F96; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#0A3F96<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #3B74D1; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#3B74D1<br><small>文字 #F8FAFC</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FAF8F5; color: #1C1518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#FAF8F5<br><small>文字 #1C1518</small></span></td><td><span style="background-color: #120E14; color: #F7F3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#120E14<br><small>文字 #F7F3EE</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F2EEE8; color: #1C1518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#F2EEE8<br><small>文字 #1C1518</small></span></td><td><span style="background-color: #1C1620; color: #F7F3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#1C1620<br><small>文字 #F7F3EE</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FAF8F5; color: #1C1518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #473D42;">#473D42</span></td><td><span style="background-color: #120E14; color: #F7F3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8F8288;">#8F8288</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FAF8F5; color: #1C1518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#1C1518</span></td><td><span style="background-color: #120E14; color: #F7F3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#F7F3EE</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #E0B414; color: #1C1518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #473D42;">#E0B414<br><small>文字 #1C1518</small></span></td><td><span style="background-color: #F5CF47; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8F8288;">#F5CF47<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
