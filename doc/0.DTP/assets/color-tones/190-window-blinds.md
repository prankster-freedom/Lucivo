# 190. ブラインドの影（Window Blinds）

- **ID**: `window-blinds`
- **トーン区分**: つよい＋くらい（strong + dark）
- **配色技法**: アクセントカラー（オレンジを主役に、煉瓦と黒で光と影をつくる）
- **基にした配色**: `#F9AF3C`（オレンジ）、`#C47550`（煉瓦）、`#282B2B`（黒）、`#F6EDE8`（白）
- **印象・用途**: 午後の光とブラインド。郷愁とモダンさのある、ブランド・写真の話題向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・オレンジ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #BF7606; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#BF7606</span></td><td><span style="background-color: #F9AF3C; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#F9AF3C</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・煉瓦）</td><td><code>--vs-c2</code></td><td><span style="background-color: #C47550; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#C47550</span></td><td><span style="background-color: #C47550; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#C47550</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・黒）</td><td><code>--vs-c3</code></td><td><span style="background-color: #282B2B; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#282B2B</span></td><td><span style="background-color: #778080; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#778080</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・オレンジの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #7F4F04; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#7F4F04</span></td><td><span style="background-color: #FCD394; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#FCD394</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F6EDE8; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#F6EDE8</span></td><td><span style="background-color: #171108; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#171108</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F6E8DA; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#F6E8DA</span></td><td><span style="background-color: #231A0C; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#231A0C</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F6EDE8; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #7C7977;">#7C7977</span></td><td><span style="background-color: #171108; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6E6862;">#6E6862</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F6EDE8; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#181A1A</span></td><td><span style="background-color: #171108; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#FBF6F4</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F9AF3C; color: #181A1A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #7C7977;">#F9AF3C</span></td><td><span style="background-color: #F9AF3C; color: #FBF6F4; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6E6862;">#F9AF3C</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
