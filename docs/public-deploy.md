# 预览与正式发布边界

2026-10-31校准。旧“本地3002/测试Stripe密钥/云托管价格”等环境假设已移 [历史资料](history/README.md)，不是当前事实。

## 本地审阅

应用使用pnpm dev，默认http://localhost:3000。纯设计HTML可以用绑定127.0.0.1的静态预览服务，本次确认稿不连接商品API、不创建订单，也没有发布到公网。

## 对外预览

当前仓库没有一键临时公网预览配置或已验证的托管平台部署。若需要分享链接，需单独选择发布环境/域名/访问范围；先核对配置、凭据、隐私和数据库路径，再执行发布。不要把个人开发机的.env、SQLite或目录通过静态站点整体公开。

## 正式发布

现行工程主路径见 [deployment](deployment.md)：Docker Compose、nginx、SQLite volume，构建/运行配置均需到位；health ok不等于真实商品/支付已验证。商业fallback已取消；上线验收需检查真实商品、503/404/no-store、重试恢复及故障页noindex。

未实施PostgreSQL，不能以改DATABASE_PROVIDER解决多实例/无状态托管问题。若改平台，单独评估原生模块、持久卷、GeoIP文件追踪、网络及回跳URL，不复制早期平台推荐即上线。
