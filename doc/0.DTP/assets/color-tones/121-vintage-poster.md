# 121. 古いポスター（Vintage Poster）

- **ID**: `vintage-poster`
- **トーン区分**: つよい＋にぶい（strong + dull）
- **配色技法**: 色相配色（黄と灰みの青の補色を、クリームでつなぐ）
- **基にした配色**: `#647499`（灰青）、`#EFBB3F`（イエロー）、`#FBF5E6`（クリーム）
- **印象・用途**: 色あせた旅行ポスター。懐かしく落ち着いた、歴史・カルチャー向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・イエロー）</td><td><code>--vs-c1</code></td><td><span style="background-color: #B4830F; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#B4830F</span></td><td><span style="background-color: #EFBB3F; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#EFBB3F</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・灰青）</td><td><code>--vs-c2</code></td><td><span style="background-color: #647499; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#647499</span></td><td><span style="background-color: #7382A3; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#7382A3</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・イエローの濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #77570A; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#77570A</span></td><td><span style="background-color: #F6DA95; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#F6DA95</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・灰青の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #505D7A; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#505D7A</span></td><td><span style="background-color: #AAB3C7; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#AAB3C7</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #FBF5E6; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#FBF5E6</span></td><td><span style="background-color: #1B1811; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#1B1811</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #FAF0D9; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#FAF0D9</span></td><td><span style="background-color: #29241A; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#29241A</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #FBF5E6; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8E9094;">#8E9094</span></td><td><span style="background-color: #1B1811; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #716E67;">#716E67</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #FBF5E6; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#343D50</span></td><td><span style="background-color: #1B1811; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#FDFAF3</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #EFBB3F; color: #343D50; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E9094;">#EFBB3F</span></td><td><span style="background-color: #EFBB3F; color: #FDFAF3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #716E67;">#EFBB3F</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
