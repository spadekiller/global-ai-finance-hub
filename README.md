# Global AI Finance Hub

Global AI Finance Hub 是一個使用純 HTML、CSS、JavaScript 製作的全球 AI 財經新聞儀表板測試版。內容主軸是全球 AI 產業、模型平台、雲端算力、晶片、監管、企業導入、開源與安全治理。

> 目前所有新聞內容皆為測試資料，非投資建議。

## 功能

- 顯示全球 AI 財經最新新聞與最後更新時間
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

測試會驗證 HTML/CSS/JavaScript 基本結構、JSON 格式、全球 AI 財經新聞分類、新聞欄位，以及預設新聞渲染行為。
