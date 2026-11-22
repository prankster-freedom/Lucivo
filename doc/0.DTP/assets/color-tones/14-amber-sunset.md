# 14. 琥珀の夕暮れ（Amber Sunset）

- **ID**: `amber-sunset`
- **トーン区分**: やわらかい〜にぶい（soft / dull）
- **配色技法**: グラデーション＋ウォームシェード（黄金→朱→茜→暮紫）
- **印象・用途**: 日光の温もりと時間の移ろい。振り返り・ロードマップ・エモーショナルな提案書向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・琥珀）</td><td><code>--vs-c1</code></td><td><span style="background-color: #E89B3C; color: #291C20; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#E89B3C<br><small>文字 #291C20</small></span></td><td><span style="background-color: #F2AF5C; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#F2AF5C<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・朱鷺）</td><td><code>--vs-c2</code></td><td><span style="background-color: #E06A5A; color: #291C20; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#E06A5A<br><small>文字 #291C20</small></span></td><td><span style="background-color: #EB8678; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#EB8678<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・茜）</td><td><code>--vs-c3</code></td><td><span style="background-color: #B84D6F; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#B84D6F<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #D16F8E; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#D16F8E<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・暮紫）</td><td><code>--vs-c4</code></td><td><span style="background-color: #6D597A; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#6D597A<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #9680A6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#9680A6<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFFBF7; color: #291C20; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#FFFBF7<br><small>文字 #291C20</small></span></td><td><span style="background-color: #1A1318; color: #FAF3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#1A1318<br><small>文字 #FAF3EE</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FAF2EA; color: #291C20; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#FAF2EA<br><small>文字 #291C20</small></span></td><td><span style="background-color: #261C23; color: #FAF3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#261C23<br><small>文字 #FAF3EE</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFFBF7; color: #291C20; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6B555B;">#6B555B</span></td><td><span style="background-color: #1A1318; color: #FAF3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A68D94;">#A68D94</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFFBF7; color: #291C20; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#291C20</span></td><td><span style="background-color: #1A1318; color: #FAF3EE; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#FAF3EE</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F59E0B; color: #291C20; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6B555B;">#F59E0B<br><small>文字 #291C20</small></span></td><td><span style="background-color: #FCD34D; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A68D94;">#FCD34D<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
