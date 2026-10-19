# 埋点与监链路 · MVP 方案

> 目标：把「用户在产品里做了什么」和「系统在哪里坏了」记录下来，存在**自己的服务器**上，用于产品决策与故障排查。
> 明确**不是**用来替代 GA4 / Meta Pixel —— 那两个是给广告平台做优化的，这个是给自己做决策的。

---

## 一、先划清边界（这决定了整个设计）

| 需求 | 谁能提供 | 说明 |
| --- | --- | --- |
| 用户点了哪些商品 | **客户端埋点** | 只有浏览器知道 ✓ |
| 页面加载失败 / JS 报错 | **客户端 + 服务端** | 两边都要 ✓ |
| 服务端 500 / 404 | **服务端** | 客户端看不到完整信息 ✓ |
| **真实成交额、订单** | **Shopify Webhook** ✗ | **付款发生在 Shopify** ✓ 客户端数据不可信 ✗ |
| 广告渠道转化 | GA4 / Meta / TikTok | 不在本方案范围 ✓ |

**关键结论**：**收入必须来自服务端（Shopify webhook），不能来自客户端埋点** ✗
原因：客户端事件会被**广告拦截器**拦掉 10–30% ✓，用户也可能关 JS ✓ —— 拿它算收入必然偏低 ✓

---

## 二、架构

```
┌─────────────── 浏览器 ───────────────┐
│ AnalyticsProvider                     │
│  · 路由变化 → page_view               │
│  · 事件委托 → click（读 data-track）  │
│  · window.onerror / unhandledrejection│
│  · useReportWebVitals                 │
└──────────────┬────────────────────────┘
               │ navigator.sendBeacon（批量，不阻塞渲染）
               ▼
      POST /api/events
               │ ① zod 校验
               │ ② 按 sessionId 限流（60/min）
               │ ③ 富化：country / device / ua / referrer / utm
               ▼
   ┌───────────────────────┐        ┌──────────────────────┐
   │ SQLite: analyticsEvent│        │ stdout 结构化日志     │
   │ （保留 90 天）         │        │ （docker logs 可查）  │
   └───────────┬───────────┘        └──────────────────────┘
               ▼
      pnpm analytics:report（CLI 只读查询）

┌────────── 服务端 ──────────┐
│ instrumentation.ts         │ 服务端未捕获异常
│ middleware / route 包装     │ 5xx、404、慢请求
└────────────┬───────────────┘
             │ 同一条写库通道
             ▼

┌────────── Shopify ─────────┐
│ orders/paid webhook        │ → /api/webhooks/shopify
│ （HMAC 校验）               │   → 写入 order 事件（收入真值）
└────────────────────────────┘
```

---

## 三、事件模型

### 统一表 `analyticsEvent`

```ts
{
  id: string;              // uuid
  type: "page_view" | "click" | "error_client" | "error_server" | "web_vital" | "order";
  name: string;            // "page_view" / "product_card" / "TypeError" / "LCP" / "paid"
  path: string;            // /products/black-pearl
  sessionId: string;       // 随机，会话级（sessionStorage）
  anonId: string;          // 随机，长期（localStorage）
  props: json;             // 事件自定义字段
  country: string | null;  // 复用 pickCountry（现有逻辑 ✓）
  device: "mobile" | "tablet" | "desktop";
  referrer: string | null;
  utm: json | null;        // source/medium/campaign/content/term
  ts: integer;             // 服务器接收时间（毫秒）
}
```

### 关键设计：**点击不逐个接线，用 `data-track` 属性 + 事件委托**

```tsx
// 加一个属性就够了，不用给每个组件传回调
<ProductCard data-track="product_card" data-track-id={product.code} />

// 一处监听全站（AnalyticsProvider 里）
document.addEventListener("click", (e) => {
  const el = (e.target as Element).closest("[data-track]");
  if (!el) return;
  track("click", el.dataset.track!, { id: el.dataset.trackId ?? null });
}, { capture: true });
```

**为什么这样做**：
- 组件**零改造** ✓ 加属性即可 ✓
- 新增埋点不改 TS 类型、不改 props 链 ✓
- 失效可控（属性没加就不上报 ✓ 不会报错 ✓）

**MVP 建议埋的 5 个点**（不要一上来埋一堆 ✗）：

| `data-track` | 加在哪 | 能回答的问题 |
| --- | --- | --- |
| `product_card` | 商品卡（列表/名册/系列） | 哪些商品被点得最多 |
| `add_to_bag` | 加购按钮 | 加购转化率 |
| `checkout_start` | 购物袋 Checkout | 进结算的流失 |
| `hero_slide` | 头图指示条 | 头图是否有互动 |
| `nav` | 顶部导航 | 用户去哪 |

---

## 四、传输：为什么用 `sendBeacon`

```ts
navigator.sendBeacon("/api/events", blob)
```

- **页面卸载也能送达** ✓（`fetch` 在 unload 时会被取消 ✗）
- **不阻塞渲染** ✓
- **失败静默** ✓（埋点绝不能影响购物 ✗✓）

**批量**：客户端缓冲 1–2 秒或 10 条，一次发 ✓ —— 减少请求数 ✓

**路径选择**：用 `/api/events` 而不是 `/api/track` ✓ —— `track` / `analytics` / `collect` 这类词更容易被广告拦截器匹配 ✗

---

## 五、服务端接收：三件必须做的事

### ① 校验（zod）
拒绝畸形 payload ✓ —— 否则表里会混进垃圾 ✗

### ② 限流
`sessionId` 维度 **60 事件/分钟** ✓ —— 匿名端点不限流等于给自己开了一个 DoS 入口 ✗

### ③ 富化 + 脱敏
- `country`：**复用现有的 `pickCountry()`** ✓（已经处理了 XFF / cf-ipcountry / geoip ✓）
- `device`：UA 粗分类 ✓（不存完整 UA ✗）
- **不存 IP** ✗ —— 存了就涉及个保法/CCPA ✓
- **不存 email / 姓名 / 地址** ✗ —— 埋点表里出现 PII 是合规事故 ✓
- `referrer`：只存 host + path ✓ 去掉 query 里的敏感参数 ✗

---

## 六、服务端错误怎么采

| 来源 | 做法 |
| --- | --- |
| 未捕获异常 | `src/instrumentation.ts` 已存在 ✓ 加 `process.on("uncaughtException")` + `unhandledRejection` ✓ |
| 路由 5xx | 包一层 `withTracking(handler)` ✓ 或 `onRequestError`（Next 15 ✓） |
| 404 | middleware 里判断 ✓（**重点**：记录**哪些 URL 404** ✓ —— 这能直接发现坏链接 ✓） |
| 慢请求 | 记录 > 2s 的请求 ✓ |

**404 记录的价值被低估** ✗ —— 你的站刚经历过**系列配图文件名错误** ✓ 那类问题在 404 日志里一眼可见 ✓

---

## 七、收入真值：Shopify Webhook（必需）

```
Shopify 后台 → 设置 → 通知 → Webhook
  订单付款 (orders/paid) → https://isoffy.com/api/webhooks/shopify
```

必须做：
- **HMAC 校验**（`X-Shopify-Hmac-Sha256` ✓）—— 否则任何人都能往你库里灌假订单 ✗
- **幂等**（`orderId` 唯一索引 ✓ —— Shopify 会重试 ✓）
- 只存**分析需要的字段**（金额 ✓ 币种 ✓ 商品 handle ✓ 国家 ✓），不存客户 PII ✗

---

## 八、落地清单（MVP，按依赖排序）

| # | 内容 | 文件 | 工作量 |
| --- | --- | --- | --- |
| 1 | `analyticsEvent` 表 + 迁移 | `src/server/db/schema.ts` | 0.5h |
| 2 | `/api/events`（zod + 限流 + 富化 + 批量写） | `src/app/api/events/route.ts` | 2h |
| 3 | `AnalyticsProvider`（page_view / click / error / vitals） | `src/components/analytics/` | 2h |
| 4 | 5 个 `data-track` 属性 | 商品卡 / 加购 / 结算 / 头图 / 导航 | 1h |
| 5 | 服务端错误采集 | `instrumentation.ts` + `onRequestError` | 1h |
| 6 | Shopify webhook + HMAC | `src/app/api/webhooks/shopify/route.ts` | 2h |
| 7 | `pnpm analytics:report`（几个固定查询） | `scripts/analytics-report.mjs` | 1.5h |
| 8 | 保留策略（90 天自动清理） | 同上脚本或启动时 | 0.5h |

**合计约 10.5 小时**，但可以**分 3 次交付**：

- **第 1 次（3h）**：1+2+3 ✓ → 能看 page_view 与 click
- **第 2 次（2h）**：4+5 ✓ → 有具体埋点 + 错误采集
- **第 3 次（3.5h）**：6+7+8 ✓ → 收入真值 + 报表 + 保留

---

## 九、报表（`pnpm analytics:report` 输出的几件事）

```sql
-- 最常被点的商品
SELECT props->>'id' AS code, COUNT(*) FROM analytics_event
WHERE type='click' AND name='product_card' GROUP BY 1 ORDER BY 2 DESC LIMIT 20;

-- 404 最多的路径（坏链接探测器）
SELECT path, COUNT(*) FROM analytics_event
WHERE type='error_server' AND props->>'status'='404' GROUP BY 1 ORDER BY 2 DESC LIMIT 20;

-- 加购 → 结算漏斗
SELECT name, COUNT(DISTINCT "sessionId") FROM analytics_event
WHERE type='click' GROUP BY 1;

-- 成交（真值，来自 Shopify）
SELECT SUM((props->>'total')::numeric), props->>'currency' FROM analytics_event
WHERE type='order' GROUP BY 2;
```

**注意**：SQLite 的 JSON 查询语法与 PostgreSQL 不同 ✓ —— 现在用 SQLite ✓，`json_extract` ✓。生产若切 PG，这几条要改 ✓。

---

## 十、已知局限（必须提前知道）

1. **客户端事件会丢 10–30%** ✗（广告拦截器 / 无 JS ✓）→ **不要用它算收入** ✓✓
2. **服务端无法知道"用户点了但页面没跳转"** ✗（那是纯客户端 ✓）
3. **同一用户跨设备无法关联** ✗（没有登录 ✓）→ 只能靠 `anonId` 单设备 ✓
4. **SQLite 不是分析库** ✗ —— 数据量到百万行级会慢 ✓；到那时应导到 ClickHouse/BigQuery ✓ —— MVP 阶段完全够用 ✓
5. **埋点表会长得比业务表快得多** ✗ —— 90 天保留 + 定期清理是**必须**的 ✓ 不是可选项 ✓
6. **自己搭不等于免费** ✓ —— 你要维护 schema、报表、清理 ✓；GA4 免费但数据不在你手里 ✓ **取舍由你定** ✓
