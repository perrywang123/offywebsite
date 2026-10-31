# 生产管理员白名单验收

2026-10-31。生产后台仅允许规范化邮箱`wangperry666@gmail.com`。账号创建/重置、密码登录和已有session授权共用同一策略；其他历史账号及其会话拒绝访问。开发/隔离测试账号不受生产白名单影响。

密码创建/重置支持12–256字符，使用随机盐scrypt。用户指定初始密码已通过隐藏stdin处理，仅将哈希写入Git忽略的私密`.env`，文件权限600；没有把密码或实际哈希写入源码、文档、模板或输出日志。

Docker在迁移后执行`kol-admin-bootstrap.mjs`，从运行时`KOL_ADMIN_BOOTSTRAP_HASH`创建尚不存在的owner；已有密码不覆盖，后续CLI重置不会被旧bootstrap配置恢复。此配置不放入build args。部署操作见 [运行手册](kol-platform-operations.md)。

验证：

- 7项专项测试通过：owner规范化/12位密码、非白名单创建拒绝、历史有效密码和会话拒绝、Gmail别名拒绝、CLI创建及私密哈希准备、幂等初始化、重置后不回退。
- 全量79个测试文件、513项测试通过；typecheck、lint、standalone生产build通过。
- Compose配置、Prettier、git diff --check和OpenSpec校验通过。
- 未连接或修改生产服务器；未修改现有本地tester测试账号。生产部署使用私密运行配置后完成首次账号初始化，不能把本地准备当作已在线生效。
