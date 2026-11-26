#!/usr/bin/env bash
# Despliegue de SIGTI en QA (rama qa). Lo ejecuta una persona de Sistemas en la VPS.
#
#   cd /opt/sigti-qa/app && ./deploy/qa/deploy.sh
#
# Pasos: actualiza la rama qa (solo fast-forward) → construye la imagen con el commit
# como etiqueta → levanta la BD → respalda la BD → migra → reemplaza la app →
# verifica /api/health/ready. No borra datos ni toca otros contenedores de la VPS.
set -euo pipefail

SIGTI_HOME="${SIGTI_HOME:-/opt/sigti-qa}"
ENV_FILE="$SIGTI_HOME/.env"
BACKUP_DIR="$SIGTI_HOME/backups"
TAG_FILE="$SIGTI_HOME/current-tag"
BRANCH="qa"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "No existe $ENV_FILE (copia deploy/qa/env.example y llénalo)."
[ -z "$(git status --porcelain)" ] || fail "Hay cambios locales en $REPO_DIR. No se despliega."

compose() {
  docker compose -f deploy/qa/docker-compose.yml --env-file "$ENV_FILE" "$@"
}

log "Actualizando la rama $BRANCH (solo fast-forward)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git merge --ff-only "origin/$BRANCH"

TAG="$(git rev-parse --short=12 HEAD)"
PREV_TAG="$(cat "$TAG_FILE" 2>/dev/null || echo ninguna)"
export SIGTI_IMAGE_TAG="$TAG"
echo "Versión a desplegar: $TAG (anterior: $PREV_TAG)"

log "Validando docker-compose.yml"
compose config --quiet

log "Construyendo la imagen sigti-qa-app:$TAG"
compose build app

log "Levantando la base de datos"
compose up -d --wait db

log "Respaldando la base de datos"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/sigti-qa-$(date +%Y%m%d-%H%M%S)-antes-de-$TAG.dump"
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_FILE"
[ -s "$BACKUP_FILE" ] || fail "El respaldo quedó vacío: $BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
echo "Respaldo: $BACKUP_FILE"

log "Aplicando migraciones"
compose run --rm app npm run migrate

log "Reemplazando la app"
compose up -d --wait app

log "Verificando /api/health/ready"
PORT="$(grep -E '^SIGTI_HOST_PORT=' "$ENV_FILE" | tail -n1 | cut -d= -f2 | tr -d '[:space:]')"
HEALTH="$(curl -fsS --retry 5 --retry-delay 2 --retry-all-errors "http://127.0.0.1:$PORT/api/health/ready")" \
  || fail "La app no respondió bien. Revisa: docker compose -p sigti-qa logs app"
echo "$HEALTH"
case "$HEALTH" in
  *"\"version\":\"$TAG\""*) ;;
  *) fail "La app responde, pero con otra versión (se esperaba $TAG)." ;;
esac

echo "$TAG" > "$TAG_FILE"

log "Despliegue completo: $TAG"
compose ps
echo
echo "Si hay que volver atrás, sigue la sección 'Reversión' de deploy/qa/README.md."
echo "Versión anterior: $PREV_TAG · Respaldo: $BACKUP_FILE"
