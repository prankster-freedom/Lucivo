# 191. 70 年代の花瓶（Seventies Vase）

- **ID**: `seventies-vase`
- **トーン区分**: つよい＋うすい（strong + pale）
- **配色技法**: 色相配色（ティールとマスタードの対比に、煉瓦を添える）
- **基にした配色**: `#0099A1`（ティール）、`#EFBB3F`（マスタード）、`#C47550`（煉瓦）、`#FAE5D6`（白）
- **印象・用途**: レトロな陶器と観葉植物。懐かしく元気な、インテリア・カルチャー向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・ティール）</td><td><code>--vs-c1</code></td><td><span style="background-color: #0099A1; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#0099A1</span></td><td><span style="background-color: #0099A1; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#0099A1</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・マスタード）</td><td><code>--vs-c2</code></td><td><span style="background-color: #B9870F; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#B9870F</span></td><td><span style="background-color: #EFBB3F; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#EFBB3F</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・煉瓦）</td><td><code>--vs-c3</code></td><td><span style="background-color: #C47550; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#C47550</span></td><td><span style="background-color: #C47550; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#C47550</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・白）</td><td><code>--vs-c4</code></td><td><span style="background-color: #B68867; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#B68867</span></td><td><span style="background-color: #FAE5D6; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#FAE5D6</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FEFBF9; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#FEFBF9</span></td><td><span style="background-color: #101613; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#101613</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FDF6F1; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#FDF6F1</span></td><td><span style="background-color: #18201D; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#18201D</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FEFBF9; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A38E84;">#A38E84</span></td><td><span style="background-color: #101613; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6A6A65;">#6A6A65</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FEFBF9; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#593524</span></td><td><span style="background-color: #101613; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#FDF2EB</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EFBB3F; color: #593524; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A38E84;">#EFBB3F</span></td><td><span style="background-color: #EFBB3F; color: #FDF2EB; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6A65;">#EFBB3F</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
