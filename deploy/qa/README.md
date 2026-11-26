# SIGTI · Despliegue en QA

Runbook para `https://sigtiqa.portalpetrocasinos.com`. Lo ejecuta una persona de Sistemas con acceso
a la VPS. Los secretos solo existen en `/opt/sigti-qa/.env` y nunca se pegan en el chat ni en tickets.

## Cómo queda aislado

| Recurso | Valor | Comparte con otros sistemas |
|---|---|---|
| Proyecto compose | `sigti-qa` (contenedores `sigti-qa-app-1`, `sigti-qa-db-1`) | No |
| Redes | `sigti_qa_backend` (interna, sin salida) y `sigti_qa_edge` | No |
| Volumen de datos | `sigti_qa_pgdata` | No |
| PostgreSQL | Contenedor propio, sin puerto publicado | No |
| Puerto de la app | `127.0.0.1:${SIGTI_HOST_PORT}` (no se expone a internet) | No |
| Nginx | Archivo propio `sites-available/sigtiqa.portalpetrocasinos.com` | Sí, el servicio Nginx del host (solo `reload`) |
| Imagen | `sigti-qa-app:<commit>` | No |
| Carpeta | `/opt/sigti-qa` | No |

Límites: 512 MB de memoria por contenedor, logs rotados (3 × 10 MB), app sin privilegios
(`cap_drop: ALL`, usuario `node`).

```
/opt/sigti-qa/
├── app/          # clon del repo en la rama qa
├── .env          # secretos (chmod 600), a partir de deploy/qa/env.example
├── backups/      # pg_dump antes de cada despliegue (chmod 700)
└── current-tag   # commit desplegado
```

## 0. Inspección previa (solo lectura)

Antes del primer despliegue, correr y compartir la salida **sin valores sensibles**:

```bash
docker version --format '{{.Server.Version}}'; docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
docker network ls
sudo ss -tlnp
sudo nginx -T 2>/dev/null | grep -E 'server_name|listen|proxy_pass' || echo "Nginx no está en el host"
ls /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null
sudo certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains'
df -h /; free -m
getent hosts sigtiqa.portalpetrocasinos.com
```

Con eso se elige `SIGTI_HOST_PORT` (un puerto libre) y se confirma que Nginx corre en el host.
Si Nginx corre en un contenedor, este runbook cambia en el paso 2: avisar antes de seguir.

## 1. Preparación (una sola vez)

```bash
sudo mkdir -p /opt/sigti-qa && sudo chown "$USER": /opt/sigti-qa
git clone -b qa https://github.com/soportesistemas-petrocasinos/SIGTI.git /opt/sigti-qa/app
cp /opt/sigti-qa/app/deploy/qa/env.example /opt/sigti-qa/.env
chmod 600 /opt/sigti-qa/.env
nano /opt/sigti-qa/.env      # llenar SIGTI_HOST_PORT, POSTGRES_PASSWORD, AUTH_INITIAL_PASSWORD
```

Para las contraseñas: `openssl rand -hex 24`.

## 2. Nginx y certificado (una sola vez)

```bash
PORT=<SIGTI_HOST_PORT>
sudo cp /opt/sigti-qa/app/deploy/qa/nginx-sigtiqa.conf.example \
  /etc/nginx/sites-available/sigtiqa.portalpetrocasinos.com
sudo sed -i "s/SIGTI_HOST_PORT/$PORT/" /etc/nginx/sites-available/sigtiqa.portalpetrocasinos.com
sudo ln -s /etc/nginx/sites-available/sigtiqa.portalpetrocasinos.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d sigtiqa.portalpetrocasinos.com
```

Si `nginx -t` falla, **no** recargar: borrar el enlace de `sites-enabled` y revisar.
La cookie de sesión es `Secure`: sin HTTPS el login no funciona en QA.

## 3. Desplegar

```bash
cd /opt/sigti-qa/app && ./deploy/qa/deploy.sh
```

El script se detiene ante cualquier error. Hace, en orden:

1. Actualiza la rama `qa` solo con fast-forward (si hay cambios locales, no sigue).
2. Construye `sigti-qa-app:<commit>`.
3. Levanta la BD y la respalda con `pg_dump` en `backups/`.
4. Aplica las migraciones pendientes.
5. Reemplaza la app y espera su healthcheck.
6. Verifica `GET /api/health/ready` y que la versión sea el commit esperado.

## 4. Verificar

```bash
curl -fsS https://sigtiqa.portalpetrocasinos.com/api/health/ready
docker compose -p sigti-qa ps
docker compose -p sigti-qa logs --tail 50 app
```

Luego, en el navegador: abrir `https://sigtiqa.portalpetrocasinos.com`, iniciar sesión y cambiar la
contraseña inicial.

## 5. Cargar usuarios (opcional)

Los informes `.xlsx` tienen datos personales (Ley 1581). Cargar usuarios reales en QA requiere
la decisión del dueño funcional y, si aplica, el concepto de Jurídica. Si se aprueba:

```bash
mkdir -p /opt/sigti-qa/seeds            # copiar aquí los .xlsx (scp)
chmod 755 /opt/sigti-qa/seeds && chmod 644 /opt/sigti-qa/seeds/*.xlsx
cd /opt/sigti-qa/app
SIGTI_IMAGE_TAG="$(cat /opt/sigti-qa/current-tag)" docker compose \
  -f deploy/qa/docker-compose.yml --env-file /opt/sigti-qa/.env \
  run --rm -v /opt/sigti-qa/seeds:/seeds:ro -e EMPLOYEES_EXCEL_DIR=/seeds app npm run seed
rm -f /opt/sigti-qa/seeds/*.xlsx         # no dejar los informes en la VPS
```

## Reversión

Variables de apoyo:

```bash
cd /opt/sigti-qa/app
C="docker compose -f deploy/qa/docker-compose.yml --env-file /opt/sigti-qa/.env"
PREV=<commit anterior que imprimió deploy.sh>
```

**A. El despliegue no tenía migraciones nuevas:** volver a la imagen anterior.

```bash
SIGTI_IMAGE_TAG=$PREV $C up -d --wait app && echo "$PREV" > /opt/sigti-qa/current-tag
```

**B. Tenía migraciones:** restaurar también el respaldo. **Borra los datos posteriores al
respaldo; requiere aprobación explícita antes de ejecutarlo.**

```bash
$C stop app
$C exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  < /opt/sigti-qa/backups/<archivo>.dump
SIGTI_IMAGE_TAG=$PREV $C up -d --wait app && echo "$PREV" > /opt/sigti-qa/current-tag
```

## Retirar SIGTI QA de la VPS

`docker compose -p sigti-qa down` detiene y borra contenedores y redes de SIGTI, sin tocar datos.
Borrar el volumen `sigti_qa_pgdata` elimina la BD de QA: solo con aprobación explícita.
