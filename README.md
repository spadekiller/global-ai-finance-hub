# 全球 AI 財經情報站

以純 HTML、CSS、JavaScript 製作的響應式財經新聞儀表板第一版，支援深色／淺色模式、關鍵字搜尋，以及分類、來源與自選股篩選。

> 目前所有內容均為測試資料，不構成投資建議。

## 本地預覽

由於頁面使用 fetch 載入 JSON，請在專案根目錄啟動靜態伺服器：

    python -m http.server 8000

再開啟 http://localhost:8000/ 。

## 驗證

    node tests/site.test.mjs

所有資源皆採相對路徑，可直接部署至 GitHub Pages 的 repository 子路徑。
