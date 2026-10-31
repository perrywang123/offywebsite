## 1. Spec and failing tests

- [x] 1.1 定义并校验独立后台发布规范
- [x] 1.2 先添加 Git 更新、后台独立替换及共享数据/上游配置的失败测试

## 2. Implementation

- [x] 2.1 同仓库独立 admin 容器、镜像和 worker 上游，保持原持久卷
- [x] 2.2 服务器后台脚本、Git 重载与共享锁、配置/备份/就绪检查
- [x] 2.3 Nginx 后台独立上游及配置校验
- [x] 2.4 更新文档、命令及当前架构说明

## 3. Validation

- [x] 3.1 执行部署与 Git 隔离集成测试、完整单测、类型、lint、构建
- [x] 3.2 验证 Compose 和真实 Nginx HTTPS 边界，记录 Docker 实测边界
- [x] 3.3 归档变更并检查当前规范
