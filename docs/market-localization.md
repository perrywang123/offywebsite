# Ship to 与国家判定

本次实现：首次推荐 + 显式 Ship to 选择。Offy 不承诺推断出 Shopify 私有地理定位结果；实际配送地址、运费与最终可售状态仍由 Shopify 结账核定。

## 顺序与稳定性

1. 有效已保存偏好先使用。手动选择保存 90 天；自动判定固定 30 分钟有效，记录服务器生成时间 `resolvedAt`，Cookie Max-Age 为 1800 秒。均为 HttpOnly、SameSite=Lax 的同源 Cookie。读取和重复 resolve 不延长自动结果的有效期。
2. 无有效偏好时，使用明确配置并由可信入口覆盖的国家请求头；标准 Nginx 部署默认不信任客户端自报国家头。
3. 使用 Nginx 覆盖的 X-Real-IP，兼容无该头时既有 XFF 路径，解析本机国家库。原始 IP 不写入新增判定记录。
4. IP 无有效结果时，用浏览器 IANA 地理时区；再用有区域标识的浏览器语言。裸 en、zh 与 UTC 偏移不能推断国家。
5. 无法识别时默认 US。

自动结果在 30 分钟有效期内保持稳定，IP 改变不立即更换价格市场；到期后下一次请求忽略旧结果并按当前信号重新判断。服务器同时验证时间戳，过期、未来时间、格式错误或旧版没有时间戳的自动 Cookie 均失效；旧版手动 Cookie 保持兼容。浏览器恢复会话不会延长这 30 分钟。首次弱判定会短暂等待浏览器线索，只有确认 Cookie 保存成功才在必要时重载原 URL；网络或 Cookie 失败会释放初始页面，不循环刷新。已保存国家可随时主动修改。

## 选择和购物袋

Header 和购物袋有 Ship to 入口；桌面为面板，手机为底部弹层。选择列表与币种来自实时 Shopify localization。选择后必须确认；取消不变更。切换保留 URL 参数及购物袋 code/quantity，不保存旧商品事实。

非空购物袋切换前提示价格/可售状态可能变化，之后重新打开购物袋供核对。当前商品详情在新市场不存在时使用品牌化未找到提示，保留国家/购物袋入口；无法在新市场确认的购物袋商品显示通用不可用行，保留数量并允许删除/切回；不展示旧价格、旧图或完整小计，结账禁用。旧标签页带 expectedCountry 提交时，服务器发现不一致会返回 409 并记录诊断，不调用 Shopify 创建 cart。旧客户端无该字段仍兼容服务器权威判定。

Shopify 目录 @inContext、bag API 与 cart buyerIdentity.countryCode 使用同一个服务器决定。选择国家不直接更改 Shopify 市场、库存、运费规则、商品或订单。页面导航（含查询参数变化）和标签页回到前台会检查偏好，已建立的上下文过期或国家变化时刷新同一 URL；没有周期定时器强制刷新正在浏览的页面，打开的国家选择弹层也不会被自动打断。网络失败或禁用 Cookie 不触发循环刷新。购物袋目录请求带显示中的国家一致性头；到期后国家变化时，服务器在查询 Shopify 前返回 409，前端不接纳另一市场的商品事实，而是保留商品与数量、刷新页面并打开购物袋核对。普通无一致性头的目录读取保持兼容。

## 数据库更新

无 MaxMind 账号也可运行现有 geoip-lite 随包 IP 库。新增可选 Country MMDB 热读取器：每分钟最多检查一次文件变化，成功验证才换入；损坏更新保留最后有效读取器。该文件缺失不阻塞站点。

GeoLite 下载要求账户、接受使用协议及专用下载许可。账号注册、邮箱验证和 GeoLite 开通已完成；首次配置与以后更新启动命令为：

```bash
cd /root/offywebsite
git pull --ff-only
bash deploy/update-geoip.sh
```

首次脚本交互读取 Account ID 与下载 License Key；Key 不回显，之后复用服务器现有凭据。凭据只保留在服务器 `.offy-geoip.local/`，不入 Git、镜像或客户端。独立官方 updater 启动时立即检查，之后每 72 小时检查 GeoLite2-Country，只有新版才下载；限 CPU 0.1 / RAM 96 MB，挂载既有数据卷，不构建或重启主站、后台及订单 worker。默认 App 路径 `/data/GeoLite2-Country.mmdb`。生产激活及验证结果见[验收记录](market-localization-verification.md)。

GeoLite Country 通常在每周二、周五发布，[官方建议至少每周检查两次](https://maxmind.github.io/geoipupdate/doc/geoipupdate/)；72 小时检查约每周 2.3 次。用户访问仅查本地文件，不逐次请求 MaxMind、不上传访客 IP。新文件由应用热读取，有效期内的自动推荐与已保存的手动国家不会因国家库更新立即改变；自动推荐过期后才重新解析。

This product includes GeoLite data created by MaxMind, available from [https://www.maxmind.com](https://www.maxmind.com). 数据只用于国家推荐；不用于定位具体个人或住址，不对外提供数据库。按已接受的协议保持更新，新版本替换旧库，不另行归档旧国家库。

检查状态：

```bash
docker compose -f docker-compose.prod.yml -f deploy/docker-compose.geoip.yml ps geoipupdate
```

上述 Compose 直接命令需先 `export OFFY_GEOIP_SECRET_DIR="$PWD/.offy-geoip.local"`；常规启动只用封装脚本即可。不要把凭据贴到聊天、命令历史、公开日志或仓库。

[IANA 时区来源](https://www.iana.org/time-zones)：版本化 `tzdata2026f` 的 zone.tab、iso3166.tab 和 backward；生成脚本 `scripts/update-market-geography.py` 记录来源与 SHA256。使用地理区域而非时差等价关系。
[MaxMind 官方更新容器](https://maxmind.github.io/geoipupdate/doc/docker/)提供凭据文件、更新周期和数据库目录配置。

## 边界

IP、时区、语言均是推荐信号，VPN、旅行和跨境收货会造成偏差，用户确认最可靠。标准部署要求应用端口只监听 loopback，Nginx 覆盖真实 IP；接 CDN 时需要单独配置并验证可信代理，不能直接信任所有传入国家头。Cookie 被禁用时仍可浏览，但无法声称保存国家成功。

自动推荐时效、浏览器及主站独立发布证据见[2026-11-10 有效期验收](market-preference-expiry-verification.md)。
