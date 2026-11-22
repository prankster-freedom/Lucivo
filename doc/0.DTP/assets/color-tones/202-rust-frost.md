# 202. 錆と霜（Rust Frost）

- **ID**: `rust-frost`
- **トーン区分**: くらい＋あかるいはいみ（dark + light grayish）
- **配色技法**: アクセントカラー（淡い霜色と灰青の地に、錆色を差す）
- **基にした配色**: `#832F12`（錆）、`#9AA4AF`（灰青）、`#E9F4F0`（霜）
- **印象・用途**: 冬の古い倉庫。渋く落ち着いた、歴史・クラフト向け。

## カラーコード一覧

<table>
<thead>
<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>第 1 色（主役・錆）</td><td><code>--vs-c1</code></td><td><span style="background-color: #832F12; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#832F12</span></td><td><span style="background-color: #D44C1D; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#D44C1D</span></td><td>見出しアクセント・主ノード・カード 1</td></tr>
<tr><td>第 2 色（副色・灰青）</td><td><code>--vs-c2</code></td><td><span style="background-color: #808D9B; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#808D9B</span></td><td><span style="background-color: #9AA4AF; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#9AA4AF</span></td><td>カード 2・手順 2・補助グラフ</td></tr>
<tr><td>第 3 色（展開・錆の濃淡）</td><td><code>--vs-c3</code></td><td><span style="background-color: #832F12; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#832F12</span></td><td><span style="background-color: #BB8D7D; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#BB8D7D</span></td><td>カード 3・手順 3・分岐</td></tr>
<tr><td>第 4 色（締め・灰青の濃淡）</td><td><code>--vs-c4</code></td><td><span style="background-color: #505A65; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#505A65</span></td><td><span style="background-color: #C7CDD3; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#C7CDD3</span></td><td>カード 4・手順 4・補足</td></tr>
<tr><td>ベース背景</td><td><code>--diag-canvas</code></td><td><span style="background-color: #E9F4F0; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#E9F4F0</span></td><td><span style="background-color: #150803; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#150803</span></td><td>図・スラブの背景面</td></tr>
<tr><td>補助面（カード）</td><td><code>--vs-card-bg</code></td><td><span style="background-color: #E1E4DE; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#E1E4DE</span></td><td><span style="background-color: #1F0B04; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#1F0B04</span></td><td>カード・ノードの面</td></tr>
<tr><td>境界・線</td><td><code>--diag-edge</code></td><td><span style="background-color: #E9F4F0; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #947D72;">#947D72</span></td><td><span style="background-color: #150803; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 2px solid #6A6460;">#6A6460</span></td><td>結線・区切り罫線</td></tr>
<tr><td>文字（主）</td><td><code>--text-primary</code></td><td><span style="background-color: #E9F4F0; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#4F1C0B</span></td><td><span style="background-color: #150803; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#F4FAF8</span></td><td>本文・見出し・ノード文字</td></tr>
<tr><td>光彩（グロウ）</td><td><code>--vs-glow</code></td><td><span style="background-color: #9AA4AF; color: #4F1C0B; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #947D72;">#9AA4AF</span></td><td><span style="background-color: #9AA4AF; color: #F4FAF8; padding: 2px 6px; border-radius: 4px; font-weight: 500; border: 1px solid #6A6460;">#9AA4AF</span></td><td>シグナル・ライト・スポットライト</td></tr>
</tbody>
</table>
