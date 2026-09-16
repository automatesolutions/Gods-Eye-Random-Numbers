#!/bin/sh
set -eu

gviz_from() {
  raw=$1
  [ -z "$raw" ] && return 0
  case "$raw" in
    *tqx=out:csv*|*output=csv*|*/export?*)
      printf '%s' "$raw"
      return 0
      ;;
  esac
  id=$(printf '%s' "$raw" | sed -n 's|.*/spreadsheets/d/\([^/?#]*\).*|\1|p')
  gid=$(printf '%s' "$raw" | sed -n 's/.*[?&#]gid=\([0-9]*\).*/\1/p')
  [ -z "${gid:-}" ] && gid=0
  [ -n "$id" ] && printf 'https://docs.google.com/spreadsheets/d/%s/gviz/tq?tqx=out:csv&gid=%s' "$id" "$gid"
}

write_proxy() {
  game=$1
  raw=$2
  dest=$(gviz_from "$raw" || true)
  [ -z "$dest" ] && return 0
  cat <<EOF
    location = /_sheets/${game} {
        proxy_ssl_server_name on;
        proxy_set_header Host docs.google.com;
        proxy_set_header Accept text/csv,*/*;
        proxy_pass ${dest};
    }
EOF
}

{
  cat <<'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json text/csv;

EOF
  write_proxy 42 "${VITE_SHEET_42:-}"
  write_proxy 45 "${VITE_SHEET_45:-}"
  write_proxy 49 "${VITE_SHEET_49:-}"
  write_proxy 55 "${VITE_SHEET_55:-}"
  write_proxy 58 "${VITE_SHEET_58:-}"
  cat <<'EOF'

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
} > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
