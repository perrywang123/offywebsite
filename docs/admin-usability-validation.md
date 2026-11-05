# 管理后台交互与 UI 改造验收

日期：2026-11-04。范围是五个管理栏目和共用弹窗。本轮在前两项本地改动（单名称合作表单、持久导航）基础上继续实施，没有提交、推送或发布生产。

## 评审结论与实现

按用户要求，交互、美术专家分别评估，再由研发专家按冻结的 OpenSpec、失败回归和设计契约实现；主代理负责浏览器及集成验收。两位评审沿用各自原量表，交互 **62→86/100**，视觉 **58→86/100**。这是有证据约束的启发式评审，不是用户实验或无障碍认证。详见 [交互报告](admin-interaction-review.md)、[视觉报告](admin-visual-review.md) 和 [设计契约](design/kol-admin/DESIGN.md)。

搜索、下拉和日期统一为可见关联标签、白底及44px控件；桌面订单五项筛选对齐，手机高级筛选可以收起，已选条件、错误和清空入口保持可见。日期起止成组；倒置日期给出明确修正说明，诊断不会提交错误范围，也不会把旧结果冒充新查询结果。清空只作用于当前栏目。空库、零匹配和读取失败分开表达，优惠码和月结不再只剩空表头。

手机账簿行转换为带字段名的记录，保留对象、金额、币种和动作；平板保留有名称、可聚焦的局部横向滚动。弹窗分成头部、唯一滚动正文和正常流操作页脚；订单、优惠码及月结的有后果操作显示所选对象与适用金额。原有原生校验、Esc及关闭后的焦点返回保留。诊断请求增加取消检查，避免过时筛选响应覆盖已重置列表。

没有修改财务算法、权限、Shopify 请求、归因、schema或部署脚本；服务器仍对动作作最终核验。优惠码不产生归因、不同币种不混算、已付批次历史不回写等约束保持有效。

## 隔离数据与完整链路

使用 `pnpm kol:integration`，仅监听3900–3903的loopback服务，独立临时 SQLite 和 `.next-kol-integration` 编译目录，不读取项目真实 Shopify 凭据。没有接触线上服务、真实付款或真实 Shopify 配置。先运行有数据场景，再另建空数据库验证真正空态。

有数据环境包含4位合作达人、长中英文名称、可选社媒留空、64字符优惠码、USD/GBP订单、多商品诊断和负佣金调整。GBP订单 `#UI-GBP-900001` 是通过既有账本函数写入的本地UI样例，不是Shopify远端订单；其余订单来自模拟器。只保留不含凭据的 [样例摘要](design/kol-admin/usability-review/fixture-summary.json)。

- `node scripts/kol-integration-workflow.mjs`：17项通过，覆盖链接当次归因、优惠码、模拟订单核验、月结和退款。已付批次USD6.53保留历史快照；退款后当前佣金USD4.35，新增USD -2.18调整。
- `node scripts/checkout-diagnostics-integration.mjs`：7类场景通过，覆盖正常/警告、HTTP/GraphQL错误、商品读取失败、直接结账和浏览器前置失败；原文加密、按需查看审计、权限/CSRF及数据库完整性通过。见 [场景证据](design/kol-admin/usability-review/diagnostics-integration.json)。
- 浏览器实际创建合作，展开长可选备注；错误日期返回明确原因、保留输入并聚焦提示，修正后留空社媒成功保存。三类确认对象与所选记录一致；实际冻结、解除隔离订单后重新核验成功。绑定不存在的模拟优惠码显示明确错误。没有执行真实付款登记或真实店铺写入。
- 合作、优惠码和月结的零匹配搜索显示恢复入口；清空后恢复原记录。订单按GBP筛选仅显示GBP样例，折叠后仍显示已选币种摘要。诊断按GB筛选返回1条，清空恢复10条。
- Chrome原生日期通过键盘更改验证：订单非法区间显示错误而非伪空列表；诊断起日2027-11-10、止日2027-11-01禁用提交并说明当前列表为上次结果。仅自动化 `fill` 原生受控日期不足以代表用户修改，验收采用原生键盘事件核实。
- 新建第二个完全空的临时库，五栏目各检查375/1440px，共10组。每页显示对应的暂无记录说明；合作/优惠码提供下一步入口。见 [空态文案与宽度](design/kol-admin/usability-review/empty-states.json)。

## 浏览器布局证据

五栏目在360、375、768、900、901、1024、1280、1440、1920px宽、900px高下检查，共45组；[测量记录](design/kol-admin/usability-review/layout-matrix.json) 中整页无横向溢出。常用button/input/select均至少44×44px；原生checkbox以关联标签命中范围另行考虑，不宣称checkbox本身44px。平板局部表格仍可滚动，区域具备名称和键盘焦点。

1440px订单筛选控件均44px高，同一行顶/底边差0px。最后一处手机工具栏修复后，在360/375px重新测量：搜索与刷新均44px高、顶/底边差0px，见 [最终工具栏几何](design/kol-admin/usability-review/toolbar-final-geometry.json)。该最后CSS改动未改变45组矩阵中的页面宽度边界；手机截图已更新。

375px长合作弹窗：头部40.6–121.6px、正文121.6–698.4px、页脚698.4–771.4px；最后备注字段467–557px完整位于正文可视区，页脚没有覆盖。原生Tab可继续进入下一字段，Esc关闭后焦点回到“新增合作”，见 [焦点记录](design/kol-admin/usability-review/keyboard-focus.json)。

| 可核对视图 | 桌面                                                                 | 手机                                                               |
| ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 合作达人   | [1440](design/kol-admin/usability-review/after-partners-1440.jpg)    | [375](design/kol-admin/usability-review/after-partners-375.jpg)    |
| 优惠码管理 | [1440](design/kol-admin/usability-review/after-codes-1440.jpg)       | [375](design/kol-admin/usability-review/after-codes-375.jpg)       |
| 订单佣金   | [1440](design/kol-admin/usability-review/after-orders-1440.jpg)      | [375](design/kol-admin/usability-review/after-orders-375.jpg)      |
| 月度结算   | [1440](design/kol-admin/usability-review/after-settlements-1440.jpg) | [375](design/kol-admin/usability-review/after-settlements-375.jpg) |
| 结账诊断   | [1440](design/kol-admin/usability-review/after-checkouts-1440.jpg)   | [375](design/kol-admin/usability-review/after-checkouts-375.jpg)   |

补充：[订单筛选展开](design/kol-admin/usability-review/after-orders-expanded-375.jpg)、[收起后条件摘要](design/kol-admin/usability-review/after-orders-filtered-375.jpg)、[诊断筛选展开](design/kol-admin/usability-review/after-checkouts-expanded-375.jpg)、[合作弹窗末段](design/kol-admin/usability-review/after-partner-dialog-bottom-375.jpg)、[订单确认](design/kol-admin/usability-review/after-order-context-375.jpg)、[月结确认](design/kol-admin/usability-review/after-settlement-context-375.jpg)、[代码确认](design/kol-admin/usability-review/after-code-context-375.jpg)。同目录保留改造前截图和10张独立空库截图，图片均为浏览器原始捕获。

## 自动化与交付状态

本轮新增10项有意义回归，相关3文件23项通过；覆盖筛选恢复、日期、无匹配、对象摘要、错误作用域、弹窗结构和取消请求的竞态。曾发现格式化器移除条件类名片段中的空格，使展开样式失效；已改为完整类名分支，并补充契约回归，之后重新浏览器验收。

最终 `pnpm test --maxWorkers=1 --testTimeout=15000 --reporter=dot`：**99文件、642项全部通过**，耗时130.04秒。单worker避免与构建争抢资源，15秒为这次执行的超时预算，未修改测试断言或项目超时配置。`pnpm build`在最后CSS修订后再次通过，包含先行ESLint、Next.js类型检查及standalone构建；另行`pnpm typecheck`及相关ESLint通过。文档链接、Prettier与diff空白检查通过。

OpenSpec变更 `2026-11-04-admin-usability-review` 已严格验证、归档，并将新增要求合入主规范；归档后全部8个主规范严格校验通过。

两套临时数据库、虚构账号/会话、测试启动进程及临时样例脚本已清理；3900–3903不再监听，原有3000服务保持运行。QA浏览器标签已关闭，viewport临时覆盖已恢复。没有向本地常用库或生产库写入本轮样例。

剩余P2为手机诊断页头/说明密度、平板宽账簿的局部横滚成本、部分技术状态文案。未专项穷尽真实移动软键盘、200%缩放及屏幕阅读器组合；45组布局验收不能等同这些能力的合规证明。真实Shopify、线上网络和生产财务仍按既有上线流程验证。

## 2026-11-04 下拉箭头复修

用户随后指出闭合态下拉箭头仍贴近右边框。上一轮只核对了控件外框/高度，没有落实平台原生箭头的内距；原86分是当轮专家判断，不代表所有视觉细节已完善。此次先用真实页面复现，再修共用CSS，不改组件或业务代码。

后台select使用16px图标盒、右侧12px和垂直居中；文字右侧留40px，避免与箭头重叠。仍是原生select及菜单，不新增自制菜单组件；强制颜色模式恢复系统箭头（此分支已静态核对，未专项实测系统高对比模式）。手机订单展开筛选改为单列下拉，避免默认“全部币种（分开核算）”被两列窄宽截断；日期仍相邻，收起态高度不变。

本次独立loopback/空临时库检查订单360/375/768/1440/1920，诊断375/1440，合作弹窗375/1440、优惠码/月结弹窗375，共11组。共用箭头样式一致、控件44px，页面没有新增横向溢出；订单“已核验”和合作“首页”选项切换成功，焦点可见，原生菜单可开闭；优惠码/月结的禁用占位选项仍保留。未创建合作、优惠码、财务或诊断样例。临时库与登录会话、服务及临时viewport已清理，原服务未被重启。

证据：[修前桌面](design/kol-admin/select-spacing/before-orders-1440.jpg)、[修后桌面](design/kol-admin/select-spacing/after-orders-1440.jpg)、[箭头特写](design/kol-admin/select-spacing/after-filter-detail-1440.jpg)、[手机展开](design/kol-admin/select-spacing/after-orders-375.jpg)、[合作弹窗](design/kol-admin/select-spacing/after-partner-dialog-375.jpg)、[诊断筛选](design/kol-admin/select-spacing/after-checkouts-375.jpg)、[11组检查](design/kol-admin/select-spacing/layout-checks.json)。本轮纯样式没有新增镜像CSS的单元测试，以改前截图及改后浏览器验收补足jsdom无法验证的箭头布局。

最终`pnpm build`（含ESLint与Next.js类型检查）及单独`pnpm typecheck`通过；`pnpm test --maxWorkers=1 --testTimeout=15000 --reporter=dot`再次通过99文件、642项（247.37秒）。本轮无业务测试断言或超时配置修改。视觉修正以无spec delta归档，主规范保持既有能力；该次验收时尚未提交或发布；后续Git交付不代表服务器已完成生产部署。
