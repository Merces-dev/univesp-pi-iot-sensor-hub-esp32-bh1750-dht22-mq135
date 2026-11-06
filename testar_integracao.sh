#!/usr/bin/env bash
# Roteiro de testes de integração - rode na raiz do repositório com a stack no ar (docker compose up --build)
# Uso: bash testar_integracao.sh | tee resultado_testes.txt
API=${API:-http://localhost:3000/api}
ok(){ echo "[OK]   $1"; }; fail(){ echo "[FALHA] $1"; }
echo "=== Teste de integração $(date '+%d/%m/%Y %H:%M:%S') ==="
echo "--- T1 health"; H=$(curl -s $API/health); echo "$H"; echo "$H" | grep -q '"database":"up"' && ok T1 || fail T1
echo "--- T2 gravação (linhas no banco)"
N1=$(docker exec postgres psql -U postgres -d sensorhub -tAc "SELECT count(*) FROM measurements"); echo "linhas: $N1"
sleep 10
N2=$(docker exec postgres psql -U postgres -d sensorhub -tAc "SELECT count(*) FROM measurements"); echo "linhas após 10 s: $N2"
[ "$N2" -gt "$N1" ] && ok T2 || fail T2
echo "--- T3 consulta com limite"
C=$(curl -s "$API/measurements?limit=5" | grep -o '"id"' | wc -l | tr -d ' '); echo "retornou $C registros"; [ "$C" = "5" ] && ok T3 || fail T3
echo "--- T4 resumo"; curl -s $API/measurements/summary; echo
echo "--- T5 data inválida deve dar 400"
S=$(curl -s -o /dev/null -w '%{http_code}' "$API/measurements?from=abc"); echo "status $S"; [ "$S" = "400" ] && ok T5 || fail T5
echo "--- T6 persistência após reiniciar o backend"
A=$(docker exec postgres psql -U postgres -d sensorhub -tAc "SELECT count(*) FROM measurements")
docker compose restart backend >/dev/null 2>&1; sleep 15
B=$(docker exec postgres psql -U postgres -d sensorhub -tAc "SELECT count(*) FROM measurements"); echo "antes: $A | depois: $B"
[ "$B" -ge "$A" ] && ok T6 || fail T6
echo "--- T7 banco fora do ar -> degraded"
docker compose stop postgres >/dev/null 2>&1; sleep 5
H=$(curl -s $API/health); echo "$H"; echo "$H" | grep -q degraded && ok T7 || fail T7
docker compose start postgres >/dev/null 2>&1; sleep 15
H=$(curl -s $API/health); echo "após religar: $H"; echo "$H" | grep -q '"database":"up"' && ok T7b || fail T7b
echo "--- Exportar CSV para a análise"
docker exec postgres psql -U postgres -d sensorhub -c "\copy (SELECT * FROM measurements ORDER BY id) TO STDOUT WITH CSV HEADER" > medicoes.csv && echo "medicoes.csv gerado ($(wc -l < medicoes.csv) linhas)"
