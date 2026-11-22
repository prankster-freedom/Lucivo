# 20. 分光プリズムと黒曜石（Cyber Prism）

- **ID**: `cyber-prism`
- **トーン区分**: あかるい＋くらい（bright + dark）
- **配色技法**: コンプレックスハーモニー（暗い無彩色と発光する分光の対比）
- **印象・用途**: Lucivo の「光と透明」を先端的に見せるコントラスト。技術ショーケース・製品デモ向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・シアン）</td><td><code>--vs-c1</code></td><td><span style="background-color: #0284C7; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#0284C7<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #38BDF8; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#38BDF8<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・マゼンタ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #DB2777; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#DB2777<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #F472B6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#F472B6<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・バイオレット）</td><td><code>--vs-c3</code></td><td><span style="background-color: #7C3AED; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#7C3AED<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #A78BFA; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#A78BFA<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・エメラルド）</td><td><code>--vs-c4</code></td><td><span style="background-color: #059669; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#059669<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #34D399; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#34D399<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F8FAFC; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#F8FAFC<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #090D16; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#090D16<br><small>文字 #F8FAFC</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EFF3F8; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#EFF3F8<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #111827; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#111827<br><small>文字 #F8FAFC</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F8FAFC; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #475569;">#475569</span></td><td><span style="background-color: #090D16; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #64748B;">#64748B</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F8FAFC; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#0F172A</span></td><td><span style="background-color: #090D16; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#F8FAFC</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #00F0FF; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #475569;">#00F0FF<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #67E8F9; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#67E8F9<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
