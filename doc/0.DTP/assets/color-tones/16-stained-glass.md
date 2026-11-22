# 16. 教会のステンドグラス（Stained Glass）

- **ID**: `stained-glass`
- **トーン区分**: こい〜あかるい（deep / bright）
- **配色技法**: セパレーション（濃紺の鉛線で鮮やかな 4 色を際立たせる）
- **印象・用途**: 色の境界がくっきり立ち上がる宝石のような輝き。図解・状態遷移・マルチモジュール構成向け。

## カラーコード一覧

セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・瑠璃）</td><td><code>--vs-c1</code></td><td><span style="background-color: #2A9AD6; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#2A9AD6<br><small>文字 #1F1830</small></span></td><td><span style="background-color: #4FB5EC; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#4FB5EC<br><small>文字 #1E293B</small></span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・萌黄）</td><td><code>--vs-c2</code></td><td><span style="background-color: #9CC65A; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#9CC65A<br><small>文字 #1F1830</small></span></td><td><span style="background-color: #B2D678; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#B2D678<br><small>文字 #1E293B</small></span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・柘榴）</td><td><code>--vs-c3</code></td><td><span style="background-color: #E0287A; color: #F8FAFC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#E0287A<br><small>文字 #F8FAFC</small></span></td><td><span style="background-color: #F0569B; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#F0569B<br><small>文字 #1E293B</small></span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・山吹）</td><td><code>--vs-c4</code></td><td><span style="background-color: #F7B04A; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#F7B04A<br><small>文字 #1F1830</small></span></td><td><span style="background-color: #FAC36E; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#FAC36E<br><small>文字 #1E293B</small></span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFFFFF; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#FFFFFF<br><small>文字 #1F1830</small></span></td><td><span style="background-color: #120E1D; color: #F7F5FC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#120E1D<br><small>文字 #F7F5FC</small></span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F8F7FC; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#F8F7FC<br><small>文字 #1F1830</small></span></td><td><span style="background-color: #1C162E; color: #F7F5FC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#1C162E<br><small>文字 #F7F5FC</small></span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線（鉛線）</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFFFFF; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #2B2140;">#2B2140</span></td><td><span style="background-color: #120E1D; color: #F7F5FC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7A6B9E;">#7A6B9E</span></td><td>結線・セパレーション境界</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFFFFF; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#1F1830</span></td><td><span style="background-color: #120E1D; color: #F7F5FC; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#F7F5FC</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #38BDF8; color: #1F1830; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #2B2140;">#38BDF8<br><small>文字 #1F1830</small></span></td><td><span style="background-color: #7DD3FC; color: #1E293B; display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7A6B9E;">#7DD3FC<br><small>文字 #1E293B</small></span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
