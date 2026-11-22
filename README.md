# A股市场宽度 · Breadth Lab

一个可部署的深色响应式网页，展示每日 A 股涨跌家数、ADR、成交量与成交额结构、TRIN-量、TRIN-额以及历史走势。**不是静态截图，而是可自动更新的数据网站。**

## 设计和数据口径

- 数据：Tushare 中转接口 `daily`（HTTP POST，一天一次拉全市场）；`trade_cal` 识别交易日。
- 范围：当日有 `daily` 有效记录的沪、深、北 A 股。停牌股票不会计入；不应当误读为所有已上市股票总数。
- 上涨/下跌/平盘：比较 `close` 和除权昨收 `pre_close`。
- 成交量：`vol` 单位“手”；成交额：`amount` 千元 × 1000 转元。
- 上涨股票占比（截图将其标为“ADR”）：上涨家数 / 当日有效股票数 × 100%；图表中的「涨跌家数比 A/D」另按上涨家数 / 下跌家数 × 100% 计算，两者不可混淆。
- TRIN-量：(上涨家数/下跌家数) / (上涨成交量/下跌成交量)。TRIN-额同理，把成交量替换成成交额。
- “额价差”：原图没有明确、可验证的计算口径，暂时不自动显示，避免不准确的指标。
- `data/sample.json` 是用户提供的**日期未知截图数据**，在没有真实行情时仅供页面演示，不进入历史走势。

## 一次配置，以后自动更新（推荐 GitHub Pages，免费）

1. 将本文件夹的内容上传到一个 **新的 GitHub 仓库**，默认分支命名为 `main`。确保 `.github/workflows/update-and-deploy.yml` 也一起上传。建议仓库设为 **Private**（但请检查账户的 Pages 功能是否支持该私有仓库）；使用免费账户时，最简单是 Public 仓库，而且 **千万不要上传 Token**。
2. 仓库 `Settings → Secrets and variables → Actions → Secrets → New repository secret`，添加：
   - `STOCK_API_TOKEN`：填你提供的 Tushare 中转 Token；建议优先使用有额度的非特权 Token，密钥内容不要发到公开仓库。
   - 可选：`Settings → Secrets and variables → Actions → Variables` 添加 `STOCK_API_URL`，设置服务商提供的 HTTPS 地址（如果有）。默认按服务商给的 HTTP 地址。
3. `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。仓库 Actions 需要允许工作流有写权限：`Settings → Actions → General → Workflow permissions → Read and write permissions`。确保 Actions 可部署 Pages。
4. `Actions` 页面选择「更新A股市场宽度并发布网站」→ `Run workflow` → 首次将 `days` 设为 `60`（约 60 个交易日历史回填）；先看日志检查接口返回。
5. 发布成功后，Pages 页面会显示网址，通常格式为 `https://<GitHub用户名>.github.io/<仓库名>/`。之后只要保留定时工作流即可每天自动更新，无需手动传 Excel。

**自动刷新时间**：周一至周五北京时间 18:10、20:10 各检查一次；节假日读取交易日历，最新数据会保持在最近交易日。定时任务由 GitHub 执行，可能延迟；每日行情正常在 15:00–16:00 入库。第一次初始化历史回填按 2 秒的请求间隔、单请求 60 秒超时、最多 4 次尝试，以控制限流。历史回填 60 日需要远多于一次请求的时间。

### 安全提醒

你提供的第三方中转接口原始地址是 `http://`，**不是加密 HTTPS**。即使放在 GitHub Secrets 中，采集程序访问 HTTP 时 Token 仍可能在传输链路上暴露。如果服务商提供 HTTPS，应立刻将 `STOCK_API_URL` 配为 HTTPS；否则请自行评估第三方中转和链路风险。建议不要把已经公开传播过的密钥继续使用。

## 本地查看

```bash
cd a-share-breadth-website
python -m http.server 8080
```

在浏览器打开 <http://localhost:8080/>。首次没有实时数据时会显示“截图示例”（清晰注明不是最新行情）。**即使浏览器刷新，只有采集工作流发布了新 JSON 才会看到新的交易日数据**。

## 本地手动拉取数据（可选）

```bash
export STOCK_API_TOKEN='你的中转 token（不写进代码）'
python scripts/update_data.py --days 60
python -m http.server 8080
```

在 Windows PowerShell：`$env:STOCK_API_TOKEN="..."`。仅在你信任的机器上使用。后台可通过服务器 cron、GitHub Actions 等定时运行。

## 常见问题

- **刷新页面还是旧日期**：检查 GitHub Actions 运行日志、当前交易日是否休市、`STOCK_API_TOKEN` 是否生效，`daily` 接口是否完成数据入库。
- **公开仓库可以吗**：公开仓库只包含 HTML/CSS/JS、聚合 JSON 和没有密钥的程序。不要把 Token 写入前端、截图代码、提交日志或任何公开文件。
- **历史曲线为空**：第一次执行一次 `days=60`；随后每天自动累积。
- **接口报权限问题**：确认中转 Token、额度和服务商权限；`daily` 和 `trade_cal` 都必须可访问。
- **为什么与截图数字不一致**：截图没有交易日期；若交易日、停牌范围、B 股过滤、集合竞价/盘后统计口径不同，家数和资金统计可能不同。

官方参考：<https://tushare.pro/document/2?doc_id=27>、<https://tushare.pro/document/1?doc_id=26>。