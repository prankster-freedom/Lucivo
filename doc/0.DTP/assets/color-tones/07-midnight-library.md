# 07. 夜を編む図書館（Midnight Library）

- **ID**: `midnight-library`
- **トーン区分**: くらい（dark）
- **配色技法**: ナチュラルハーモニー（深い彩りの中に灯る金と藍）
- **印象・用途**: 深夜の書庫や創作企画に寄り添う重厚な知性。暗所でのステージ発表・物語企画向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・臙脂）</td><td><code>--vs-c1</code></td><td><span style="background-color: #6E2A35; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#6E2A35<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #B85A68; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#B85A68<br><small>文字 #F8FAFC</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・古金）</td><td><code>--vs-c2</code></td><td><span style="background-color: #6E5C1F; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#6E5C1F<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #C2A64B; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#C2A64B<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・深緑）</td><td><code>--vs-c3</code></td><td><span style="background-color: #265A35; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#265A35<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #549E6A; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#549E6A<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・群青）</td><td><code>--vs-c4</code></td><td><span style="background-color: #26406A; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#26406A<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #5C82BF; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#5C82BF<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F4F3F0; color: #171A24; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#F4F3F0<br><small>文字 #171A24</small></span></td><td><span style="background-color: #0E1118; color: #F3F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#0E1118<br><small>文字 #F3F1EB</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EAE8E3; color: #171A24; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#EAE8E3<br><small>文字 #171A24</small></span></td><td><span style="background-color: #171C28; color: #F3F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#171C28<br><small>文字 #F3F1EB</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F4F3F0; color: #171A24; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #3F4554;">#3F4554</span></td><td><span style="background-color: #0E1118; color: #F3F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7D88A3;">#7D88A3</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F4F3F0; color: #171A24; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#171A24</span></td><td><span style="background-color: #0E1118; color: #F3F1EB; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#F3F1EB</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #D4AF37; color: #171A24; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #3F4554;">#D4AF37<br><small>文字 #171A24</small></span></td><td><span style="background-color: #F3D56B; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7D88A3;">#F3D56B<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
