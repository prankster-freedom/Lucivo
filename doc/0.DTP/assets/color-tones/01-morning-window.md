# 01. 朝の窓辺（Morning Window）

- **ID**: `morning-window`
- **トーン区分**: あさい（light）
- **配色技法**: ドミナント・トーン（明度高・中彩度で 4 色相を統一）
- **印象・用途**: 柔らかな朝日が差し込む清潔で軽やかな印象。企画書・チュートリアル・導入資料向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・コーラル）</td><td><code>--vs-c1</code></td><td><span style="background-color: #F3A7B0; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#F3A7B0<br><small>文字 #1E293B</small></span></td><td><span style="background-color: #F5B7BF; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#F5B7BF<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・レモン）</td><td><code>--vs-c2</code></td><td><span style="background-color: #F6E08E; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#F6E08E<br><small>文字 #1E293B</small></span></td><td><span style="background-color: #F8E7A6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#F8E7A6<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ミント）</td><td><code>--vs-c3</code></td><td><span style="background-color: #A8DBB0; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#A8DBB0<br><small>文字 #1E293B</small></span></td><td><span style="background-color: #B8E3BF; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#B8E3BF<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・スカイ）</td><td><code>--vs-c4</code></td><td><span style="background-color: #A9C4EC; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#A9C4EC<br><small>文字 #1E293B</small></span></td><td><span style="background-color: #B9CFF0; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#B9CFF0<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFFFFF; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#FFFFFF<br><small>文字 #1E293B</small></span></td><td><span style="background-color: #121824; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#121824<br><small>文字 #F8FAFC</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F8FAFC; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#F8FAFC<br><small>文字 #1E293B</small></span></td><td><span style="background-color: #1B2434; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#1B2434<br><small>文字 #F8FAFC</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFFFFF; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #64748B;">#64748B</span></td><td><span style="background-color: #121824; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #94A3B8;">#94A3B8</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFFFFF; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#1E293B</span></td><td><span style="background-color: #121824; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#F8FAFC</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #7DD3FC; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #64748B;">#7DD3FC<br><small>文字 #1E293B</small></span></td><td><span style="background-color: #BAE6FD; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#BAE6FD<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
