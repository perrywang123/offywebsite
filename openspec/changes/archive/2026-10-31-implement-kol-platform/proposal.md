## Why

用户已批准V2.1方案：需要品牌管理员管理KOL合作、双方式优惠码、当次session归因、Shopify事实账本与人工月结；完整验证不得影响线上。

## What Changes

- 新增受信入口与登录保护的四页后台、管理员引导脚本、合作版本和审计。
- 动态推广入口与tab内短期链路；checkout保存比例快照、签名引用与cart绑定。
- Shopify Admin读单、HMAC收件箱、持久化重试/核对任务、精确金额账本。
- 已有码绑定与向现有活动异步追加新码，远端核实后可分发。
- 按KOL/币种冻结、核对、锁单、CSV、人工付款记录及退款负调整。
- Docker worker与独立端口Nginx模板；默认关闭，隔离数据库/模拟Shopify完成操作验证。

## Capabilities

### New Capabilities

- `kol-platform`: 管理身份、合作、链接、优惠码、订单账本、月结与同步运行保障。

### Modified Capabilities

- `database`: 可选KOL独立持久层、Shopify财务证据与结算快照。

## Impact

修改schema与新增迁移、env、middleware、Shopify checkout、前台链路组件；新增管理路由/API、worker、隔离集成工具及文档。不部署生产、不访问真实店铺写接口、不自动付款。原有Shopify商品权威路径保持。
