# 10. 晴天の工作舎（Cobalt Workshop）

- **ID**: `cobalt-workshop`
- **トーン区分**: つよい（strong）
- **配色技法**: ドミナント・トーン（明快で力強い視認性）
- **印象・用途**: 迷いのない明快さとエンジニアリングの推進力。カンファレンス登壇・機能紹介向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・朱赤）</td><td><code>--vs-c1</code></td><td><span style="background-color: #D42A44; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#D42A44<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #E8546B; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#E8546B<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・山吹）</td><td><code>--vs-c2</code></td><td><span style="background-color: #E0B414; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#E0B414<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #ECC63E; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#ECC63E<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・常磐）</td><td><code>--vs-c3</code></td><td><span style="background-color: #22A046; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#22A046<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #45BD68; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#45BD68<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・コバルト）</td><td><code>--vs-c4</code></td><td><span style="background-color: #2266CC; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#2266CC<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #4D8AE6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#4D8AE6<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFFFFF; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#FFFFFF<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #0F172A; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#0F172A<br><small>文字 #F8FAFC</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F8FAFC; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#F8FAFC<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #17223B; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#17223B<br><small>文字 #F8FAFC</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFFFFF; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #334155;">#334155</span></td><td><span style="background-color: #0F172A; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #94A3B8;">#94A3B8</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFFFFF; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#0F172A</span></td><td><span style="background-color: #0F172A; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#F8FAFC</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #38BDF8; color: #0F172A; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #334155;">#38BDF8<br><small>文字 #0F172A</small></span></td><td><span style="background-color: #7DD3FC; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #94A3B8;">#7DD3FC<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
