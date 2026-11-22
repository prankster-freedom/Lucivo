# 08. 炭とインクの書斎（Charcoal Study）

- **ID**: `charcoal-study`
- **トーン区分**: くらいはいみ（dark grayish）
- **配色技法**: セパレーション（深い無彩色で色相を区切る）
- **印象・用途**: 万年筆のインクと墨のようなストイックさ。コード解説・技術仕様・アーキテクチャ図向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・焦茶）</td><td><code>--vs-c1</code></td><td><span style="background-color: #4F3C3F; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#4F3C3F<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #8E7276; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#8E7276<br><small>文字 #F8FAFC</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・墨茶）</td><td><code>--vs-c2</code></td><td><span style="background-color: #524B39; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#524B39<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #918871; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#918871<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・鉄緑）</td><td><code>--vs-c3</code></td><td><span style="background-color: #3A4A40; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#3A4A40<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #728C7C; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#728C7C<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・鉄紺）</td><td><code>--vs-c4</code></td><td><span style="background-color: #3A4150; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#3A4150<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #748099; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#748099<br><small>文字 #F8FAFC</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F5F5F4; color: #141518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#F5F5F4<br><small>文字 #141518</small></span></td><td><span style="background-color: #0D0E11; color: #F2F2F0; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#0D0E11<br><small>文字 #F2F2F0</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EBEAE8; color: #141518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#EBEAE8<br><small>文字 #141518</small></span></td><td><span style="background-color: #16181D; color: #F2F2F0; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#16181D<br><small>文字 #F2F2F0</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F5F5F4; color: #141518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #2B2D33;">#2B2D33</span></td><td><span style="background-color: #0D0E11; color: #F2F2F0; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #717682;">#717682</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F5F5F4; color: #141518; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#141518</span></td><td><span style="background-color: #0D0E11; color: #F2F2F0; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#F2F2F0</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #64748B; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2D33;">#64748B<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #94A3B8; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717682;">#94A3B8<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
