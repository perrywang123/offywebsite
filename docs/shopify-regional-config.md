# 市场、币种与区域限定

基线：2026-10-31。国家列表配置是站点推断范围，不是实时读取的完整Shopify Market清单。

## 国家判定

cf-ipcountry → x-vercel-ip-country → x-country-code → x-geo-country → x-forwarded-country → XFF首IP/x-real-ip经geoip-lite → SHOPIFY_MARKET_COUNTRY（默认US）。UK归一为GB，排除XX/EU等哨兵。国家头/IP仅是请求来源线索，不是鉴权或合规凭证，反代需有可信头策略。

## 两份列表

SHOPIFY_REGIONS指定探测范围，默认30国：US,CA,GB,AU,NZ,SG,MY,TH,HK,CN,TW,JP,KR,MO,ID,PH,VN,IN,AE,DE,FR,ES,IT,NL,SE,CH,BR,MX,ZA,SA。

SHOPIFY_TARGET_MARKETS指定哪些访客能看到限定区块，默认US,GB,SG,HK。它与探测范围不同。CN/MO/CA即使某商品可售，当前默认也不展示区域限定模块。

当前算法按国家查询Storefront完整分页可见商品；至少两国且整个配置范围全部成功才参与推断。任一探测失败则隐藏限定模块，不把未验证国家当作不可售。探测无跨请求缓存。红徽章是配置范围内的区域展示，不代表全球每个国家的正式排他资格。

## 实时价格

商品价采用Storefront @inContext(country)返回的金额和currency，Cart用同country；不是本地汇率。2026-10-31取样：US42款/USD、GB41款/GBP、HK41款/HKD；数量与映射随商家维护变化，不能作固定测试。未实时复查的旧国家/商品限定表已移历史。

[已实现方案](shopify-unavailable-design.md)取消本地商品价格fallback；区域探测不完整时隐藏不确定限定结论。页面价格复用本市场已验证的目录商品。
