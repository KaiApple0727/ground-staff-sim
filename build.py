"""src/ を1つのHTMLファイルにまとめる。公開用の index.html と、確認用の dist/ground-staff-simulator.html を書き出す"""
import pathlib, re

root = pathlib.Path(__file__).parent
src = root / 'src'
js_files = sorted((src / 'js').glob('*.js'))
js = '\n'.join(f'/* ===== {p.name} ===== */\n' + p.read_text(encoding='utf-8') for p in js_files)
# 日本語の直後の半角 ? ! を全角にそろえる(英語のセリフはそのまま)
JP = '(?<=[぀-ヿ一-鿿）])'
js = re.sub(JP + r'!\?', '！？', js)
js = re.sub(JP + r'\?', '？', js)
js = re.sub(JP + r'!', '！', js)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'game.js').write_text(js, encoding='utf-8')  # 構文チェック用
css = (src / 'style.css').read_text(encoding='utf-8')
html = (src / 'index.html').read_text(encoding='utf-8')
html = html.replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
out = root / 'dist' / 'ground-staff-simulator.html'
out.write_text(html, encoding='utf-8')
(root / 'index.html').write_text(html, encoding='utf-8')  # Render で公開されるファイル
print(out.name, len(html.encode('utf-8')), 'bytes,', len(js_files), 'js files')
