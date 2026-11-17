#!/usr/bin/env bash
# Opt-in SEO infrastructure repair. Does not build or restart any application.
set -euo pipefail
umask 077
[[ $(id -u) = 0 ]] || { echo 'Run as root on the Offy production host.' >&2; exit 1; }
for binary in nginx certbot openssl curl python3; do
  command -v "$binary" >/dev/null || { echo "Missing command: $binary" >&2; exit 1; }
done
target=/etc/nginx/conf.d/offy-www-redirect.conf
marker='# Managed by Offy ensure-www-redirect.sh'
if [[ -e "$target" ]] && ! head -1 "$target" | grep -Fxq "$marker"; then
  echo "Existing unmanaged file: $target. Inspect it before continuing." >&2; exit 1
fi
nginx -t
[[ -f /etc/letsencrypt/live/isoffy.com/fullchain.pem ]] || { echo 'Missing existing Offy certificate.' >&2; exit 1; }
backup="/root/offywebsite/.deploy-backups/www-redirect-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 -p "$backup"
install -d -m 755 /var/www /var/www/certbot /var/www/certbot/.well-known /var/www/certbot/.well-known/acme-challenge
cp -a /etc/nginx/nginx.conf /etc/nginx/conf.d "$backup/"
cp -a /etc/letsencrypt/renewal/isoffy.com.conf "$backup/renewal.conf"
nginx -T > "$backup/nginx-before.txt" 2>/dev/null
[[ ! -e "$target" ]] || cp -a "$target" "$backup/www-before.conf"
restore_on_error() {
  status=$?
  [[ -z ${probe:-} ]] || rm -f "/var/www/certbot/.well-known/acme-challenge/$probe"
  if (( status != 0 )); then
    if [[ -f "$backup/www-before.conf" ]]; then cp -a "$backup/www-before.conf" "$target"; else rm -f "$target"; fi
    nginx -t && systemctl reload nginx
    echo "WWW configuration restored; evidence: $backup" >&2
  fi
  exit "$status"
}
trap restore_on_error EXIT

# The existing main-domain vhost already serves HTTPS ACME files at this webroot.
# www requires its own HTTP challenge path before the SAN can be issued.
cat > "$target" <<'NGINX'
# Managed by Offy ensure-www-redirect.sh
server {
    listen 80;
    listen [::]:80;
    server_name www.isoffy.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://isoffy.com$request_uri; }
}
NGINX
nginx -t
systemctl reload nginx
probe="offy-www-check-$(date +%s)-$$"
printf '%s' "$probe" > "/var/www/certbot/.well-known/acme-challenge/$probe"
chmod 644 "/var/www/certbot/.well-known/acme-challenge/$probe"
for host in isoffy.com www.isoffy.com; do
  echo "Checking ACME webroot: $host"
  result=$(curl --noproxy "*" --fail --silent --show-error --location --retry 3 --retry-all-errors --retry-delay 1 --max-time 20 --resolve "$host:80:127.0.0.1" --resolve "$host:443:127.0.0.1" "http://$host/.well-known/acme-challenge/$probe")
  [[ "$result" = "$probe" ]] || { echo "ACME webroot mismatch: $host" >&2; exit 1; }
done
rm -f "/var/www/certbot/.well-known/acme-challenge/$probe"

if ! openssl x509 -in /etc/letsencrypt/live/isoffy.com/fullchain.pem -noout -checkhost www.isoffy.com | grep -q 'does match'; then
  certbot certonly --webroot --webroot-path /var/www/certbot --cert-name isoffy.com \
    --expand --non-interactive --deploy-hook "nginx -t && systemctl reload nginx" -d isoffy.com -d www.isoffy.com
fi
openssl x509 -in /etc/letsencrypt/live/isoffy.com/fullchain.pem -noout -checkhost www.isoffy.com | grep -q 'does match'
cat >> "$target" <<'NGINX'
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.isoffy.com;
    ssl_certificate /etc/letsencrypt/live/isoffy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/isoffy.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    return 301 https://isoffy.com$request_uri;
}
NGINX
nginx -t
systemctl reload nginx
# reload is asynchronous; an old worker can briefly serve the previous vhost.
for attempt in 1 2 3 4 5; do
  curl --noproxy "*" --fail --silent --show-error --max-time 20 --resolve www.isoffy.com:443:127.0.0.1 \
    -D "$backup/www-response.txt" -o /dev/null 'https://www.isoffy.com/products?offy_www_check=1'
  if grep -qi '^location: https://isoffy.com/products?offy_www_check=1' "$backup/www-response.txt"; then break; fi
  sleep 1
done
grep -qi '^location: https://isoffy.com/products?offy_www_check=1' "$backup/www-response.txt"
curl --noproxy "*" --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 1 --max-time 20 --resolve isoffy.com:443:127.0.0.1 -o /dev/null https://isoffy.com/api/health
nginx -T > "$backup/nginx-after.txt" 2>/dev/null
echo "Verified www TLS and path/query-preserving redirect. Backup: $backup"
