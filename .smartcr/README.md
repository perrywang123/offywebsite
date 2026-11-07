# Offy SmartCR 项目规则

这是按本仓库当前规范编写的项目规则，供已安装的 `yunxiao-smartcr` 技能使用，不代表已下载企业中央规则库。规则包含 Shopify 商业数据、金额/币种、Collabs 官方计佣、私有管理接口、官方跳转和独立预构建发布；默认 AST 检查继续执行，不因项目规则而关闭。

## 本地依赖

在仓库外安装检查依赖，不进入 Docker 镜像、不改服务器：

```bash
python3 -m venv "$HOME/.cache/offy-smartcr/venv"
source "$HOME/.cache/offy-smartcr/venv/bin/activate"
python3 -m pip install -r .smartcr/requirements.txt
```

已验证 Python 3.14/macOS；其他平台需确认这些包有适用的 wheel 或编译环境。Python 语法树支持 `.py`，JavaScript 支持 `.js/.mjs`，TypeScript grammar 用于 `.ts`；当前上游执行器把 `.tsx` 也交给 TypeScript grammar，可能产生 JSX 解析误差，不能替代 TypeScript、ESLint、浏览器或逐文件人工审查。Shell、YAML、CSS 和 Dockerfile 不属于本次 AST 覆盖，由规则和逐文件审查补充。

## 使用

向助手说明“按 SmartCR 审查当前改动”，指定比较基线；技能按其 `SKILL.md` 完整执行规则加载、路径匹配、正则、AST、逐规则 LLM、逐文件 LLM 与 Critic。没有连接远程规则服务，不自动上传源代码。

当前机器的技能脚本目录是 `/Users/peiyuwang/.agents/skills/yunxiao-smartcr/scripts`。加载规则和领域上下文示例：

```bash
python3 /Users/peiyuwang/.agents/skills/yunxiao-smartcr/scripts/load_rules.py --repo-root "$PWD"
python3 /Users/peiyuwang/.agents/skills/yunxiao-smartcr/scripts/parse_agents_md.py --repo-root "$PWD"
```

这两条只证明配置可读，不代表完成代码审查。完整流程和其他机器上的技能位置以实际安装为准。临时检查 JSON 写仓库外，报告按技能要求在会话中输出；不要把带客户信息的 diff、凭据或原始结账链接写入规则或报告。

上游凭据 AST 检查目前会把导入路径、配置键或错误标签误报为凭据；高 confidence 是工具设定，不等于已确认泄露。先核对具体赋值、值来源与是否为隔离样例，不为消除误报修改业务或移除其他规则。2026-11-07 已完成规则加载、路径触发、正则与三种语言 grammar 执行校验，基本业务审查结果与剩余边界见[流程复验记录](../docs/collabs-flow-revalidation.md)。涉及下单、支付、归因、结算等核心流程的修复须先向用户说明并确认，不因工具建议直接修改。

修改领域边界时同时维护 `AGENTS.md` 和 `skills/offy/rules.yaml`。规则提示要求具体可达的错误路径，不将测试样例、已清晰标注的导入报告或品牌素材误判为线上商业数据。
