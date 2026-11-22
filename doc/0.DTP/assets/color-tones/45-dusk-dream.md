# 45. 夢見る夕暮れ（Dusk Dream）

- **ID**: `dusk-dream`
- **トーン区分**: うすい＋あかるいはいみ（pale + light grayish）
- **配色技法**: カマイユ（夕陽を浴びたパステルを、近いトーンでさりげなく変える）
- **基にした配色**: `#FAD3B4`（ピーチ）、`#D4B6A4`（ローズベージュ）、`#F7E19B`（淡い黄）、`#F1ECE1`（オフホワイト）
- **印象・用途**: 夕暮れのまどろみ。夢見心地でやわらかな、詩・エッセイ・ブランドストーリー向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・淡い黄）</td><td><code>--vs-c1</code></td><td><span style="background-color: #A58212; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#A58212</span></td><td><span style="background-color: #F7E19B; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#F7E19B</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・ピーチ）</td><td><code>--vs-c2</code></td><td><span style="background-color: #B87A48; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#B87A48</span></td><td><span style="background-color: #FAD3B4; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#FAD3B4</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・ローズベージュ）</td><td><code>--vs-c3</code></td><td><span style="background-color: #B17C5C; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#B17C5C</span></td><td><span style="background-color: #D4B6A4; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#D4B6A4</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・淡い黄の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #6C5409; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#6C5409</span></td><td><span style="background-color: #FBEFC8; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#FBEFC8</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #F1ECE1; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#F1ECE1</span></td><td><span style="background-color: #25211A; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#25211A</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #F1EBDB; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#F1EBDB</span></td><td><span style="background-color: #373126; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#373126</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #F1ECE1; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #8E877F;">#8E877F</span></td><td><span style="background-color: #25211A; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #75726B;">#75726B</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #F1ECE1; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#3D342F</span></td><td><span style="background-color: #25211A; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#F8F6F0</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #F7E19B; color: #3D342F; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #8E877F;">#F7E19B</span></td><td><span style="background-color: #F7E19B; color: #F8F6F0; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #75726B;">#F7E19B</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
