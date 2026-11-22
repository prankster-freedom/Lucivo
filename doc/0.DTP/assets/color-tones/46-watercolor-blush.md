# 46. 水彩のにじみ（Watercolor Blush）

- **ID**: `watercolor-blush`
- **トーン区分**: うすい＋つよい（pale + strong）
- **配色技法**: グラデーション（ピーチからマゼンタへ、水彩のにじみのように）
- **基にした配色**: `#E67B80`（コーラルピンク）、`#D65A9C`（マゼンタ）、`#FBD3C5`（ピーチ）、`#F5F0E6`（紙白）
- **印象・用途**: 水彩絵の具のにじみ。情感豊かな、アート・作品紹介向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・マゼンタ）</td><td><code>--vs-c1</code></td><td><span style="background-color: #D65A9C; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#D65A9C</span></td><td><span style="background-color: #D65A9C; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#D65A9C</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・コーラルピンク）</td><td><code>--vs-c2</code></td><td><span style="background-color: #E16167; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#E16167</span></td><td><span style="background-color: #E67B80; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#E67B80</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ピーチ）</td><td><code>--vs-c3</code></td><td><span style="background-color: #BA7A63; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#BA7A63</span></td><td><span style="background-color: #FBD3C5; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#FBD3C5</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・マゼンタの濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #A22869; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#A22869</span></td><td><span style="background-color: #E8A4C9; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#E8A4C9</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F5F0E6; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#F5F0E6</span></td><td><span style="background-color: #220E19; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#220E19</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F3E4E0; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#F3E4E0</span></td><td><span style="background-color: #331625; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#331625</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F5F0E6; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #A1818D;">#A1818D</span></td><td><span style="background-color: #220E19; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #74676C;">#74676C</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F5F0E6; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#5C2744</span></td><td><span style="background-color: #220E19; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#FAF8F3</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #E67B80; color: #5C2744; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #A1818D;">#E67B80</span></td><td><span style="background-color: #E67B80; color: #FAF8F3; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #74676C;">#E67B80</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
