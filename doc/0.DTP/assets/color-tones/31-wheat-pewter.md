# 31. 小麦とピューター（Wheat Pewter）

- **ID**: `wheat-pewter`
- **トーン区分**: あかるいはいみ＋くらいはいみ（light grayish + dark grayish）
- **配色技法**: ドミナント・トーン（灰みの淡色をそろえ、暗いピューターで締める）
- **基にした配色**: `#E0CEA7`（小麦）、`#635E60`（ピューター）、`#CAC9CB`（錫グレー）、`#E7F3EA`（ミントホワイト）
- **印象・用途**: 素朴な麦畑と古い錫の器。穏やかで実直な、事業紹介・沿革の資料向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・小麦）</td><td><code>--vs-c1</code></td><td><span style="background-color: #A28547; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#A28547</span></td><td><span style="background-color: #E0CEA7; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#E0CEA7</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ピューター）</td><td><code>--vs-c2</code></td><td><span style="background-color: #635E60; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#635E60</span></td><td><span style="background-color: #878184; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#878184</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・錫グレー）</td><td><code>--vs-c3</code></td><td><span style="background-color: #8A888C; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#8A888C</span></td><td><span style="background-color: #CAC9CB; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#CAC9CB</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・小麦の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #6C5626; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#6C5626</span></td><td><span style="background-color: #EEE4CF; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#EEE4CF</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #E7F3EA; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#E7F3EA</span></td><td><span style="background-color: #1A1815; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#1A1815</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #E6F0E5; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#E6F0E5</span></td><td><span style="background-color: #272420; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#272420</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #E7F3EA; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #888C89;">#888C89</span></td><td><span style="background-color: #1A1815; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6C6E6A;">#6C6E6A</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #E7F3EA; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#3B383A</span></td><td><span style="background-color: #1A1815; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#F3F9F5</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #E0CEA7; color: #3B383A; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #888C89;">#E0CEA7</span></td><td><span style="background-color: #E0CEA7; color: #F3F9F5; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6C6E6A;">#E0CEA7</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
