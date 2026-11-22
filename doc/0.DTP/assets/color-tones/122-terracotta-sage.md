# 122. テラコッタとセージ（Terracotta Sage）

- **ID**: `terracotta-sage`
- **トーン区分**: にぶい＋うすい（dull + pale）
- **配色技法**: 色相配色（テラコッタと青みのセージの補色を、淡い桃色でやわらげる）
- **基にした配色**: `#CC8654`（テラコッタ）、`#B3CFCD`（セージ）、`#FDEADF`（白）
- **印象・用途**: 素焼きの鉢とハーブ。素朴で穏やかな、暮らし・園芸の話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・テラコッタ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #C5753C; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#C5753C</span></td><td><span style="background-color: #CC8654; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#CC8654</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・セージ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #5C928E; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#5C928E</span></td><td><span style="background-color: #B3CFCD; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#B3CFCD</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・テラコッタの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #804B26; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#804B26</span></td><td><span style="background-color: #E3BCA1; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#E3BCA1</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・セージの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #3B5D5A; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#3B5D5A</span></td><td><span style="background-color: #D5E5E4; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#D5E5E4</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FDEADF; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#FDEADF</span></td><td><span style="background-color: #21150D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#21150D</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F9E2D4; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#F9E2D4</span></td><td><span style="background-color: #312014; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#312014</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FDEADF; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #9B8475;">#9B8475</span></td><td><span style="background-color: #21150D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #756A63;">#756A63</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FDEADF; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#4B311F</span></td><td><span style="background-color: #21150D; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#FEF5EF</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #CC8654; color: #4B311F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #9B8475;">#CC8654</span></td><td><span style="background-color: #CC8654; color: #FEF5EF; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #756A63;">#CC8654</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
