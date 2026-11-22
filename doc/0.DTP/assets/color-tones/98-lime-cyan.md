# 98. ライムとシアン（Lime Cyan）

- **ID**: `lime-cyan`
- **トーン区分**: さえた（vivid）
- **配色技法**: 色相配色（鮮やかなライムとシアンの類似寄りの対比）
- **基にした配色**: `#05A5D2`（シアン）、`#E5E460`（ライム）
- **印象・用途**: 夏のスポーツ。軽快でエネルギッシュな、スポーツ・アウトドア向け。

## カラーコード一覧

1 列目に、行ごとの配色の組（背景・文字・境界・線の色コード）を、Light と Dark に分けて書く。背景・文字・境界・線は、この組で使う。Light / Dark の列の見本は、上が「背景に使った場合」（その色の背景の上に、組の文字色）、下が「文字色に使った場合」（ベース背景の上に、その色の文字。基本色の行だけ）。見本の数字は、背景と文字のコントラスト比で、4.5 未満は、その使い方では文字が読みにくい。見本の枠は「境界」、中の短い線は「線」の色。基本色は 2〜6 色で、使わない行は「未定義」にする。元の配色が Light 向きか Dark 向きかが決まっている配色は、向いているほうのモードだけに組を書き、もう一方のモードは「—」にする。

<table>
<thead>
<tr><th>役割と配色の組</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・シアン）<br><small style="display: inline-block; vertical-align: top; margin: 4px 12px 0 0; white-space: nowrap;">Light<br>背景 #05A5D2<br>文字 #1E293B<br>境界 #729697<br>線 #729697</small></td><td><code>--vs-c1</code></td><td><span style="background-color: #05A5D2; color: #1E293B; display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; border: 1px solid #729697;">Aaあ <small>5.1</small><span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid #729697;"></span></span><br><span style="background-color: #FBFBE7; color: #05A5D2; display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; border: 1px solid #729697;">Aaあ <small>2.7</small><span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid #729697;"></span></span></td><td>—</td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ライム）<br><small style="display: inline-block; vertical-align: top; margin: 4px 12px 0 0; white-space: nowrap;">Light<br>背景 #E5E460<br>文字 #024456<br>境界 #729697<br>線 #729697</small></td><td><code>--vs-c2</code></td><td><span style="background-color: #E5E460; color: #024456; display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; border: 1px solid #729697;">Aaあ <small>7.9</small><span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid #729697;"></span></span><br><span style="background-color: #FBFBE7; color: #E5E460; display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; border: 1px solid #729697;">Aaあ <small>1.3</small><span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid #729697;"></span></span></td><td>—</td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色<br><small>未定義</small></td><td><code>--vs-c3</code></td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>第 4 色<br><small>未定義</small></td><td><code>--vs-c4</code></td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>第 5 色<br><small>未定義</small></td><td><code>--vs-c5</code></td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>第 6 色<br><small>未定義</small></td><td><code>--vs-c6</code></td><td>—</td><td>—</td><td>—</td></tr>
<tr><td>ベース背景<br><small style="display: inline-block; vertical-align: top; margin: 4px 12px 0 0; white-space: nowrap;">Light<br>背景 #FBFBE7<br>文字 #024456<br>境界 #729697<br>線 #729697</small></td><td><code>--diag-canvas</code></td><td><span style="background-color: #FBFBE7; color: #024456; display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; border: 1px solid #729697;">Aaあ <small>10.2</small><span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid #729697;"></span></span></td><td>—</td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）<br><small style="display: inline-block; vertical-align: top; margin: 4px 12px 0 0; white-space: nowrap;">Light<br>背景 #F6F6C7<br>文字 #024456<br>境界 #729697<br>線 #729697</small></td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F6F6C7; color: #024456; display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; border: 1px solid #729697;">Aaあ <small>9.6</small><span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid #729697;"></span></span></td><td>—</td><td>カード・ノードの面</td></tr>
<tr><td>光彩（グロウ）<br><small style="display: inline-block; vertical-align: top; margin: 4px 12px 0 0; white-space: nowrap;">Light<br>背景 #05A5D2<br>文字 #1E293B<br>境界 #729697<br>線 #729697</small></td><td><code>--vs-glow</code></td><td><span style="background-color: #05A5D2; color: #1E293B; display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; border: 1px solid #729697;">Aaあ <small>5.1</small><span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid #729697;"></span></span></td><td>—</td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
