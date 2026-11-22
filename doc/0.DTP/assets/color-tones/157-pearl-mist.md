# 157. 真珠の霧（Pearl Mist）

- **ID**: `pearl-mist`
- **トーン区分**: ごくうすい（very pale）
- **配色技法**: カマイユ（白・ラベンダー・ピンク・氷色を、ほとんど同じ明るさでそろえる）
- **基にした配色**: `#E5DFEA`（ラベンダー）、`#F5E3EF`（ピンク）、`#EEF8FE`（氷）、`#F9F9FB`（白）
- **印象・用途**: 真珠の光沢。上品で控えめな、ジュエリー・式典向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ラベンダー）</td><td><code>--vs-c1</code></td><td><span style="background-color: #9C86AF; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#9C86AF</span></td><td><span style="background-color: #E5DFEA; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#E5DFEA</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ラベンダーの濃淡）</td><td><code>--vs-c2</code></td><td><span style="background-color: #6C5480; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#6C5480</span></td><td><span style="background-color: #F1EDF3; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#F1EDF3</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ラベンダーの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #574467; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#574467</span></td><td><span style="background-color: #F5F2F7; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#F5F2F7</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ラベンダーの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #483855; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#483855</span></td><td><span style="background-color: #F9F7FA; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#F9F7FA</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F9F9FB; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#F9F9FB</span></td><td><span style="background-color: #252425; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#252425</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F7F7FA; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#F7F7FA</span></td><td><span style="background-color: #373638; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#373638</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F9F9FB; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #939295;">#939295</span></td><td><span style="background-color: #252425; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #777677;">#777677</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F9F9FB; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#3F3D41</span></td><td><span style="background-color: #252425; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#FCFCFD</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F5E3EF; color: #3F3D41; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #939295;">#F5E3EF</span></td><td><span style="background-color: #F5E3EF; color: #FCFCFD; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #777677;">#F5E3EF</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
