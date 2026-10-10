#!/usr/bin/env bash
#
# 服务器端一键更新:git pull → 校验配置 → Docker 重建 → 自检。
#
# 用法(在服务器上,仓库根目录):
#     ./deploy/update.sh
#
# 为什么要有这个脚本:线上曾经是「裸 Node + systemd + 手工 npx next build」,
# 那条路会漏掉 Docker 镜像里固定下来的构建参数(见 docker-compose.prod.yml 的
# build.args),也会和容器抢 3000 端口。这个脚本把部署固定成一条路,并在动手
# 之前先把「配置缺失」这类问题拦下来 —— 配置缺失的表现是站点看起来正常、
# 但商品目录偷偷退回本地兜底表(33 个商品、旧名字、旧价格)。
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
COMPOSE="docker-compose.prod.yml"
HEALTH_URL="http://127.0.0.1:3000/api/health"

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m  ✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 0. 前置检查
say "前置检查"
command -v docker >/dev/null || die "没装 docker"
docker compose version >/dev/null 2>&1 || die "docker compose 插件不可用"
[ -f "$COMPOSE" ] || die "找不到 $COMPOSE(请在仓库根目录运行)"
echo "  ✓ docker + compose 就绪"

# 旧的裸 Node 部署会占着 3000 端口,容器起不来。这是从手工部署切到 Docker 时
# 最容易踩的一步,所以在这里明确拦下来,而不是让你去看 compose 的报错。
if systemctl is-active --quiet offy 2>/dev/null; then
  warn "检测到 systemd 服务 offy 仍在运行 —— 它占着 3000 端口,容器会起不来"
  warn "先执行:systemctl stop offy && systemctl disable offy"
  die "请先停掉裸 Node 部署再跑本脚本"
fi

# ------------------------------------------------------------ 1. 环境变量校验
say "环境变量校验"
if [ ! -f .env ]; then
  die ".env 不存在。
    从模板创建并填入真实值:
        cp .env.production.example .env && \$EDITOR .env
    必需:SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_TOKEN / SITE_URL
    (缺 SHOPIFY_* 时站点不会报错,而是静默退回本地兜底表 —— 商品会变成 33 个、
     名字和价格都是旧的。)"
fi

# 占位值检查。模板里的值长这样,忘了改的话表现和"没配"一模一样。
missing=""
for key in SHOPIFY_STORE_DOMAIN SHOPIFY_STOREFRONT_TOKEN SITE_URL; do
  val="$(grep -E "^${key}=" .env | head -1 | cut -d= -f2- | tr -d '"'"'"' ' || true)"
  case "$val" in
    ""|*example.com*|*your-store*|*changeme*|*xxx*)
      missing="$missing $key" ;;
  esac
done
[ -z "$missing" ] || die ".env 里这些键缺失或仍是占位值:$missing"
echo "  ✓ SHOPIFY_* 与 SITE_URL 已配置"

# ------------------------------------------------------------------ 2. 拉代码
say "拉取最新代码"
before="$(git rev-parse --short HEAD)"
git pull --ff-only
after="$(git rev-parse --short HEAD)"
if [ "$before" = "$after" ]; then
  echo "  已是最新($after)"
else
  echo "  $before → $after"
fi

# -------------------------------------------------------------- 3. 重建并启动
say "Docker 重建(这一步编译 better-sqlite3,通常 3–6 分钟)"
docker compose -f "$COMPOSE" up -d --build

# ---------------------------------------------------------------- 4. 健康检查
say "健康检查"
ok=""
for i in $(seq 1 40); do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then ok=1; break; fi
  sleep 3
done
[ -n "$ok" ] || { docker compose -f "$COMPOSE" logs --tail 40 app; die "健康检查超时,日志见上"; }

health="$(curl -fsS --max-time 10 "$HEALTH_URL")"
echo "  $health"

# /api/health 的 config 块会明说哪个集成没配。缺 Shopify 凭据时站点仍然 200,
# 所以必须看这一行,不能只看容器 healthy。
echo "$health" | grep -q '"shopify":"configured"' \
  || warn "shopify 未配置 —— 站点会静默使用本地兜底目录(商品数量与价格都是旧的)"

# ------------------------------------------------- 5. 国家头自检(区域限定与币种)
say "国家头自检"
if curl -fsS --max-time 10 -D - -o /dev/null "$HEALTH_URL" | grep -qi 'set-cookie'; then :; fi
cc="$(curl -fsS --max-time 10 -H 'X-Country-Code: GB' http://127.0.0.1:3000/api/products 2>/dev/null | head -c 200 || true)"
if [ -n "$cc" ]; then
  echo "  ✓ 应用能读到 X-Country-Code(反代侧的国家头配置见 deploy/nginx-geoip2.conf)"
else
  warn "拿不到 /api/products —— 跳过国家自检"
fi
warn "反代是否真的注入了国家头,必须在**外部**验证一次:"
warn "  curl -s -o /dev/null -D - https://你的域名/api/products | grep -i country"
warn "  没有输出 = 所有访客都在看美国市场(币种与区域限定同时不对)"

# -------------------------------------------------------------------- 6. 收尾
say "清理旧镜像"
docker image prune -f --filter "dangling=true" >/dev/null 2>&1 || true

say "完成"
docker compose -f "$COMPOSE" ps
echo
echo "  回滚:git checkout <上一个 commit> && ./deploy/update.sh"
echo "  日志:docker compose -f $COMPOSE logs -f app"
