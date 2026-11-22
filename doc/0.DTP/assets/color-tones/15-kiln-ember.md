# 15. 窯の熾火と灰（Kiln Ember）

- **ID**: `kiln-ember`
- **トーン区分**: にぶい〜つよい（dull / strong）
- **配色技法**: アクセントカラー（灰・炭の地に炎の熾火を 1 割差す）
- **印象・用途**: 静かな灰の中に熱い芯が灯る緊張感。Before/After 比較・課題解決・セキュリティ解説向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・熾火）</td><td><code>--vs-c1</code></td><td><span style="background-color: #E85D3F; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#E85D3F<br><small>文字 #1A191C</small></span></td><td><span style="background-color: #FF785A; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#FF785A<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・白熱）</td><td><code>--vs-c2</code></td><td><span style="background-color: #F2A340; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#F2A340<br><small>文字 #1A191C</small></span></td><td><span style="background-color: #FFB85C; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#FFB85C<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・灰青）</td><td><code>--vs-c3</code></td><td><span style="background-color: #7A8694; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#7A8694<br><small>文字 #1A191C</small></span></td><td><span style="background-color: #9CA8B8; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#9CA8B8<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・白灰）</td><td><code>--vs-c4</code></td><td><span style="background-color: #A6AEBA; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#A6AEBA<br><small>文字 #1A191C</small></span></td><td><span style="background-color: #C2C9D4; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#C2C9D4<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F8F7F6; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#F8F7F6<br><small>文字 #1A191C</small></span></td><td><span style="background-color: #121113; color: #F5F4F2; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#121113<br><small>文字 #F5F4F2</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EFEDEB; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#EFEDEB<br><small>文字 #1A191C</small></span></td><td><span style="background-color: #1C1A1E; color: #F5F4F2; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#1C1A1E<br><small>文字 #F5F4F2</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F8F7F6; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #4B4D54;">#4B4D54</span></td><td><span style="background-color: #121113; color: #F5F4F2; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #878B96;">#878B96</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F8F7F6; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#1A191C</span></td><td><span style="background-color: #121113; color: #F5F4F2; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#F5F4F2</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #FF6B35; color: #1A191C; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #4B4D54;">#FF6B35<br><small>文字 #1A191C</small></span></td><td><span style="background-color: #FF9666; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #878B96;">#FF9666<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
