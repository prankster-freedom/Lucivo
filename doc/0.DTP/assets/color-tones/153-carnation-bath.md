# 153. カーネーションの湯（Carnation Bath）

- **ID**: `carnation-bath`
- **トーン区分**: ごくうすい＋つよい（very pale + strong）
- **配色技法**: ドミナント・カラー（赤紫の色相でそろえ、マゼンタで締める）
- **基にした配色**: `#C561A1`（マゼンタ）、`#DBB5C9`（モーブ）、`#FCE1E7`（ピンク）、`#F2F2FA`（白）
- **印象・用途**: 花を浮かべた湯。華やかで癒やされる、美容・ウェルネス向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・マゼンタ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #C561A1; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#C561A1</span></td><td><span style="background-color: #C561A1; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#C561A1</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・モーブ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #BD779C; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#BD779C</span></td><td><span style="background-color: #DBB5C9; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#DBB5C9</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・マゼンタの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #943672; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#943672</span></td><td><span style="background-color: #DFA8CB; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#DFA8CB</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・モーブの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #8B4369; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#8B4369</span></td><td><span style="background-color: #EBD6E1; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#EBD6E1</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F2F2FA; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#F2F2FA</span></td><td><span style="background-color: #20101A; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#20101A</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EEE6F3; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#EEE6F3</span></td><td><span style="background-color: #2F1727; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#2F1727</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F2F2FA; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9D8598;">#9D8598</span></td><td><span style="background-color: #20101A; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #726970;">#726970</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F2F2FA; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#572B48</span></td><td><span style="background-color: #20101A; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#F9F9FD</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #DBB5C9; color: #572B48; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9D8598;">#DBB5C9</span></td><td><span style="background-color: #DBB5C9; color: #F9F9FD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #726970;">#DBB5C9</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
