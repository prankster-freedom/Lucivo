# 197. スレートと薄荷（Slate Mint）

- **ID**: `slate-mint`
- **トーン区分**: にぶい＋うすい（dull + pale）
- **配色技法**: トーン配色（灰みの青とミントの寒色を、淡い桃色で和らげる）
- **基にした配色**: `#5F707E`（スレート）、`#93CCBE`（ミント）、`#FDEADF`（白）
- **印象・用途**: 古い校舎の窓辺。懐かしく静かな、教育・報告向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・スレート）</td><td><code>--vs-c1</code></td><td><span style="background-color: #5F707E; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#5F707E</span></td><td><span style="background-color: #6C808F; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#6C808F</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ミント）</td><td><code>--vs-c2</code></td><td><span style="background-color: #469481; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#469481</span></td><td><span style="background-color: #93CCBE; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#93CCBE</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・スレートの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #4B5964; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#4B5964</span></td><td><span style="background-color: #A7B0B8; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#A7B0B8</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・ミントの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #2E6054; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#2E6054</span></td><td><span style="background-color: #C4E3DB; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#C4E3DB</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEADF; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#FDEADF</span></td><td><span style="background-color: #0F1214; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#0F1214</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F0E0D7; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#F0E0D7</span></td><td><span style="background-color: #171B1E; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#171B1E</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEADF; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8C8988;">#8C8988</span></td><td><span style="background-color: #0F1214; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6A6867;">#6A6867</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEADF; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#303940</span></td><td><span style="background-color: #0F1214; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#FEF5EF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #93CCBE; color: #303940; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8C8988;">#93CCBE</span></td><td><span style="background-color: #93CCBE; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6867;">#93CCBE</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
