# グランドスタッフシミュレーター

空港の地上係員(グランドスタッフ)になって、チェックインカウンターや搭乗ゲートの仕事をするブラウザゲームです。
パソコン・iPad(横向き)と、スマホ(縦向き)で遊べます。

## ファイルの構成

| ファイル | 内容 |
| --- | --- |
| `index.html` | 公開されるゲーム本体(`build.py` が作るので、直接は書き換えない) |
| `src/js/*.js` | ゲームのプログラム。ファイル名の番号順につなげられる |
| `src/style.css` | 見た目 |
| `src/index.html` | HTMLのひな形 |
| `build.py` | `src/` を1つの `index.html` にまとめるスクリプト |

## 更新のしかた

```
python3 build.py
```

を実行すると `index.html` が作り直されます。GitHub に送ると、Render が自動で公開し直します。

## 公開設定(Render の Static Site)

- Branch: `main`
- Build Command: なし
- Publish Directory: `.`
