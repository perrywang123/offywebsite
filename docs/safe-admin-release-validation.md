# 后台独立发布与资源保护验收

日期：2026-11-07，Asia/Shanghai。此记录为实际生产操作证据，不是仅本地模拟。

## 发布来源

功能提交：`1fc8d09947f20dfb2c9417d4df60857ce756f34e`。实现先推送 GitHub `main`，服务器通过 `git pull --ff-only` 获取，再执行 `bash deploy/update-admin.sh`。本记录与 OpenSpec 归档属于后续文档提交，不修改已发布的运行逻辑。

发布前，服务器 Git 已包含此前的后台功能，但 `offy-admin:local` 仍为 2026-11-02 构建的旧镜像。发布后运行中的 admin 与 worker 均使用镜像 `sha256:412b2fb1656fa759a53b1c2d0cfbb03eaf2f743393f4377175d88c53aa8c660b`，OCI revision 标签均为上述功能提交。

## 构建和发布

- 本地先观察到新增内存约束及旧服务拦截测试失败，再实现保护；最终100个测试文件、687项测试通过。类型检查、ESLint、Shell/Python语法、格式与OpenSpec检查通过。
- 服务器只读预检通过。旧 `offy-website.service` 已停止且禁用自动启动，不再反复执行宿主机构建。
- 实际专属 builder 为 `offy-build-6bdaedda0e72f168`。Docker inspect 确认 CPU period/quota 均为100000，Memory及MemorySwap均为1610612736字节，OCI并行度为1。
- 本次实际生产编译成功，Next.js报告编译33.8秒；保留类型检查、静态页生成和standalone追踪。2026-11-07 13:50:18构建命令退出0，完整后台发布也退出0。
- 服务替换前 SQLite 在线备份与完整性检查成功。只替换 admin、kol-worker，保留原持久数据卷。
- 发布后 owner、店铺匹配、成功worker心跳和HTTPS入口隔离检查通过；后台与worker使用已有服务器私密Client ID/Secret，无需重新注入。
- 发布成功后停止本次专属builder释放资源，缓存状态保留。以后脚本会按相同预算重新启动并复用该builder。

日志位于服务器私密 `.deploy-logs/release-admin-1fc8d09.log` 及其对应构建日志；不提交日志、凭据或数据库到Git。没有在生产进行故意OOM或压力测试；实际配额核对不代表未来所有流量和构建一定成功。

## 独立站保持运行

发布前后 app 容器均为 `990b110a6aaa18321b9d9f6e3353aafe58bbd6dc32f84ed63ff3b3525e064966`，镜像均为 `sha256:132bf56941701d2b7251d009dc1fee3562cc93129bf146d64eb6160ee0b87787`，启动时间均为 `2026-11-06T19:20:17.406591143Z`。没有重建或重启主站容器。

主站Nginx配置哈希前后均为 `c621ec067afbdb95d9518901fab5c09a2acf283be5623869c5334dd270fc267e`；本次只验证现有代理，没有改写或reload。构建期间多次主站健康接口返回200，发布后公网健康接口与后台登录页均返回200；本次开机内核查询未发现OOM记录。

发布后一次采样：app约704 MiB，admin约199 MiB，worker约17 MiB，服务器可用内存约1.9 GiB。这是瞬时观测，不是峰值或性能保证。

## 浏览器验收

通过真实HTTPS后台入口完成管理员登录；只读查看新版合作表单，确认单一KOL名称、自动唯一链接及可选社媒主页；切换订单佣金与结账诊断，确认持久侧栏、筛选控件和真实记录读取可用。没有提交新合作、优惠码、订单、付款或结算操作。worker恢复正常的Shopify读取与本地核对流程。

后续操作继续使用 [部署手册](deployment.md) 的Git更新入口，不在服务器直接执行宿主机 `npm run build`。
