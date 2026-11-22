# 18. 北欧の霜柱（Nordic Frost）

- **ID**: `nordic-frost`
- **トーン区分**: うすい〜あかるいはいみ（pale / light grayish）
- **配色技法**: クールシェード（氷・すりガラス・冬の空気を思わせる寒色統一）
- **印象・用途**: 澄み切った透明感とミニマルな静謐さ。ドキュメント規約・API 仕様・医療/科学資料向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・氷青）</td><td><code>--vs-c1</code></td><td><span style="background-color: #7EA6BF; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#7EA6BF<br><small>文字 #162330</small></span></td><td><span style="background-color: #9EC1D6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#9EC1D6<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・薄氷）</td><td><code>--vs-c2</code></td><td><span style="background-color: #A5C7D9; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#A5C7D9<br><small>文字 #162330</small></span></td><td><span style="background-color: #BDD9E8; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#BDD9E8<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・雪紫）</td><td><code>--vs-c3</code></td><td><span style="background-color: #B2B8D6; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#B2B8D6<br><small>文字 #162330</small></span></td><td><span style="background-color: #C8CDE6; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#C8CDE6<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・白樺）</td><td><code>--vs-c4</code></td><td><span style="background-color: #CBD5E1; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#CBD5E1<br><small>文字 #162330</small></span></td><td><span style="background-color: #94A3B8; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#94A3B8<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F8FBFD; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#F8FBFD<br><small>文字 #162330</small></span></td><td><span style="background-color: #0F1722; color: #F1F6FA; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#0F1722<br><small>文字 #F1F6FA</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EFF5F9; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#EFF5F9<br><small>文字 #162330</small></span></td><td><span style="background-color: #182332; color: #F1F6FA; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#182332<br><small>文字 #F1F6FA</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F8FBFD; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #647A8C;">#647A8C</span></td><td><span style="background-color: #0F1722; color: #F1F6FA; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8FA6B8;">#8FA6B8</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F8FBFD; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#162330</span></td><td><span style="background-color: #0F1722; color: #F1F6FA; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#F1F6FA</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #A5F3FC; color: #162330; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #647A8C;">#A5F3FC<br><small>文字 #162330</small></span></td><td><span style="background-color: #CFFAFE; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8FA6B8;">#CFFAFE<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
