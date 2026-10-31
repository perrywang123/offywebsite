# 一键Docker部署验收

此页记录2026-10-31首次工具验证。2026-11-01已改为独立admin容器及服务器Git后台脚本，当前补充证据见 [独立后台部署验收](admin-deployment-validation.md)，操作以 [部署手册](deployment.md) 为准。

2026-10-31。此次补齐统一服务器发布、开发机上传、源码压缩包、KOL worker/owner检查与显式Nginx管理。没有实际发布生产。

## 已验证

- 配置预检：KOL必需密钥/精确HTTPS独立origin、持久`/data`路径、loopback源站、app/worker共享镜像及秘密一致；错误只输出键名，不回显秘密。
- 服务器流程使用临时目录和Docker/SSH/curl替身：构建→在线备份→启动顺序；自动/显式KOL profile；无Git源码部署；仅检查无副作用；备份或worker就绪失败非零退出；关闭KOL停止旧worker；不删除卷、不清理其他项目镜像。
- 上传拒绝危险目录/不存在私密文件，dry-run无SSH；公共模板保留，私密env走独立stdin流程，源码同步共用排除规则。
- 源码包实际生成并枚举：包含Dockerfile、Compose、迁移、owner/worker及检查脚本；没有私密env、DB/WAL/SHM、node_modules、`.next*`或resources。文件为`dist/offy-source.tar.gz`，被git忽略。
- 只读就绪检查：owner缺失、过期/失败worker、店铺不匹配拒绝成功，不生成审计或修改账户。
- Nginx安装替身测试：语法失败保留原文件且不reload；HTTPS失败恢复旧配置再reload；成功配置及备份保持私密权限，不输出入口秘密。
- `python3 scripts/kol-nginx-check.py --deployment-template`真实运行生成器和Nginx：独立loopback49080/49443/49444，13项HTTPS边界及部署用入口检查脚本通过；使用独立CA正常验签，不跳过TLS验证，不修改系统Nginx。
- Compose JSON实际检查确认部署元数据存在、kol-worker在kol profile。应用测试/类型/lint/build、Bash语法、Python语法、格式与OpenSpec在交付时检查。

## 未验证及运行前提

Docker CLI可用，但本机daemon未运行，容器镜像构建/容器启动和Linux flock继承仍需目标服务器验证。没有连接生产，未申请证书、配置防火墙、改动Shopify权限/活动或执行真实付款。

首次使用需准备完整服务器`.env`、有效证书及实际活动Nginx配置文件（或保留已正确配置的入口）。所有这些一次性配置完成后，可以使用`pnpm deploy:kol`，或源码上传后执行`bash deploy/update.sh --kol --skip-pull`。说明见 [部署手册](deployment.md)。

## 最终结果

全量84个测试文件、530项测试通过；其中17项部署专项覆盖配置、源码包、上传、执行顺序、私密env原子安装、只读就绪及Nginx恢复。typecheck、ESLint、生产standalone build、Compose配置与Bash/Python语法检查通过。私密字段不进入控制台输出。
