# Wellenpfad als Container: statische Dateien hinter nginx (ohne Root-Rechte, Port 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx index.html manifest.webmanifest sw.js /usr/share/nginx/html/
COPY --chown=nginx:nginx css /usr/share/nginx/html/css
COPY --chown=nginx:nginx js /usr/share/nginx/html/js
COPY --chown=nginx:nginx assets /usr/share/nginx/html/assets
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
