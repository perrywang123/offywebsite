## Why

用户指定生产后台只允许唯一邮箱，并提供初始密码。当前所有数据库管理员都可登录，需要同时约束创建、登录及已有会话，避免旧测试管理员进入生产。

## What Changes

- 固定生产管理员邮箱为wangperry666@gmail.com，统一trim/lowercase；不允许别名或其他邮箱。
- 生产创建/重置、登录及每次session检查共用白名单；开发隔离账号继续可用。
- 密码最短调整为12字符，接受用户指定密码；仍使用随机盐scrypt。
- 安全准备初始密码哈希到忽略入库的运行配置；生产迁移后按哈希创建唯一管理员，不存明文、不覆盖后续密码重置。
- 更新Docker/Compose与运行手册；不执行生产部署。

## Capabilities

### Modified Capabilities

- `kol-platform`: 生产唯一管理员身份与安全初始化。

## Impact

认证服务、管理员CLI/共享策略、运行配置、Docker初始化及测试/文档；不修改业务数据、Shopify或线上部署。
