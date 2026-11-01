## 1. Spec and TDD

- [x] 1.1 定义并校验构建CPU隔离规范
- [x] 1.2 先编写配额、只检查、不支持/漂移中止和部署调用的失败测试

## 2. Implementation

- [x] 2.1 专属BuildKit构建器准备、缓存复用与真实配置核验
- [x] 2.2 主站/独立后台统一接入、宿主配置与当前文档

## 3. Validation

- [x] 3.1 隔离Docker真实构建与CPU/内核配额证据，完成测试与生产构建（证据与完整Linux应用镜像构建限制见 `docs/docker-build-cpu-validation.md`）
- [x] 3.2 归档规范、凭据/提交范围校验
