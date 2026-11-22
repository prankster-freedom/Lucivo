# 146. 野原のソルベ（Meadow Sorbet）

- **ID**: `meadow-sorbet`
- **トーン区分**: うすい＋あかるい（pale + bright）
- **配色技法**: 色相配色（緑・淡い黄・ミントの類似色相を、明るいトーンでまとめる）
- **基にした配色**: `#AACE7B`（グリーン）、`#CCE7E3`（ミント）、`#FCF3B9`（淡い黄）
- **印象・用途**: 春の野原。のどかで爽やかな、自然・子どもの話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・グリーン）</td><td><code>--vs-c1</code></td><td><span style="background-color: #739E3B; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#739E3B</span></td><td><span style="background-color: #AACE7B; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#AACE7B</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・淡い黄）</td><td><code>--vs-c2</code></td><td><span style="background-color: #A29437; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#A29437</span></td><td><span style="background-color: #FCF3B9; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#FCF3B9</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ミント）</td><td><code>--vs-c3</code></td><td><span style="background-color: #4D9F93; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#4D9F93</span></td><td><span style="background-color: #CCE7E3; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#CCE7E3</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・グリーンの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #4D6A27; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#4D6A27</span></td><td><span style="background-color: #D0E4B6; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#D0E4B6</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FFFDF5; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#FFFDF5</span></td><td><span style="background-color: #1B2114; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#1B2114</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FEFBE7; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#FEFBE7</span></td><td><span style="background-color: #29311E; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#29311E</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FFFDF5; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #919784;">#919784</span></td><td><span style="background-color: #1B2114; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #717360;">#717360</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FFFDF5; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#374328</span></td><td><span style="background-color: #1B2114; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#FEF9DC</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #AACE7B; color: #374328; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #919784;">#AACE7B</span></td><td><span style="background-color: #AACE7B; color: #FEF9DC; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #717360;">#AACE7B</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
