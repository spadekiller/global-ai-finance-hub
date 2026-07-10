# 我的 AI 財經早報

Global AI Finance Hub 目前是一個純 HTML、CSS、JavaScript 製作的全球 AI 財經早報測試版。頁面以「早報」方式呈現，而不是單純新聞卡片列表：每則條目都拆成 `[Fact]`、`[Inference]`、`[Hypothesis]`，方便快速閱讀事件、判斷與可觀察情境。

> 目前所有內容皆為測試資料，非投資建議。

## 功能

- 顯示「AI 與科技前沿」、「全球財經脈動」、「美股與全球市場焦點」三段早報
- 每則早報包含 Fact、Inference、Hypothesis
- 支援搜尋、分類與來源篩選
- 支援深色與淺色模式
- 支援桌面版與手機版
- JSON 載入失敗時顯示明確錯誤訊息
- 相對路徑相容 GitHub Pages

## 本地預覽

由於頁面會透過 `fetch()` 載入 `data/news.json`，請使用本地伺服器預覽，不要直接開啟 HTML 檔案。

```bash
node -e "const h=require('http'),f=require('fs'),p=require('path'),r=process.cwd();h.createServer((q,s)=>{const u=new URL(q.url,'http://local').pathname.slice(1)||'index.html';const x=p.join(r,u);f.readFile(x,(e,b)=>{if(e){s.writeHead(404);s.end('Not Found');return}s.end(b)})}).listen(8000)"
```

也可以使用任何靜態檔案伺服器，並從專案根目錄開啟 `index.html`。

## 測試

```bash
node --test tests/site.test.mjs
```

測試會驗證 HTML/CSS/JavaScript 基本結構、JSON 格式、早報章節、Fact/Inference/Hypothesis 欄位，以及預設渲染行為。
