# 27. レモンと黒鉛（Lemon Graphite）

- **ID**: `lemon-graphite`
- **トーン区分**: ごくうすい＋くらい（very pale + dark）
- **配色技法**: アクセントカラー（白とグレーグリーンの地に、暗い紫灰と淡いレモンで明暗の対比をつける）
- **基にした配色**: `#F7F6F7`（白）、`#C5D0CE`（グレーグリーン）、`#F1EEA2`（レモン）、`#55505D`（黒鉛）
- **印象・用途**: 鉛筆の芯とレモンの皮。知的で軽やかな、技術解説・企画書向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・黒鉛）</td><td><code>--vs-c1</code></td><td><span style="background-color: #55505D; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#55505D</span></td><td><span style="background-color: #F1EEA2; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#F1EEA2</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・レモン）</td><td><code>--vs-c2</code></td><td><span style="background-color: #BDB94A; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#BDB94A</span></td><td><span style="background-color: #C5D0CE; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#C5D0CE</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・グレーグリーン）</td><td><code>--vs-c3</code></td><td><span style="background-color: #8FA09C; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#8FA09C</span></td><td><span style="background-color: #A9A3B8; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#A9A3B8</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・藤鼠）</td><td><code>--vs-c4</code></td><td><span style="background-color: #7E7891; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#7E7891</span></td><td><span style="background-color: #E8E6E9; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#E8E6E9</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F7F6F7; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#F7F6F7</span></td><td><span style="background-color: #211F26; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#211F26</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #EEF1F0; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#EEF1F0</span></td><td><span style="background-color: #2E2B34; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#2E2B34</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F7F6F7; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8A8790;">#8A8790</span></td><td><span style="background-color: #211F26; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #625D6B;">#625D6B</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F7F6F7; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#29262F</span></td><td><span style="background-color: #211F26; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#F7F6F7</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F1EEA2; color: #29262F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8A8790;">#F1EEA2</span></td><td><span style="background-color: #F1EEA2; color: #F7F6F7; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #625D6B;">#F1EEA2</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
