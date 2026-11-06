# Integração do backend com PostgreSQL (Grupo 15)

Arquivos novos/alterados (já na estrutura do repositório):
- docker-compose.yml (serviço `postgres` + variáveis DB_* no backend)
- backend/package.json e package-lock.json (typeorm, pg, @nestjs/typeorm)
- backend/src/app.module.ts (conexão TypeORM)
- backend/src/measurements/ (entidade, serviço, controller, módulo)
- frontend/src/components/HistoryPanel.tsx (novo), Dashboard.tsx e styles/globals.css (tela "Histórico por período")
- testar_integracao.sh (testes T1 a T7 em um comando) e analise_medicoes.py (estatísticas e gráficos do relatório)

## Quem aplica: Giovani (dono do repositório)
Pré-requisitos: Git e Docker Desktop instalados e o Docker aberto.
1. Clone o repositório, crie uma branch (`git checkout -b feat/postgres-historico`) e, na raiz dele, rode `git apply integracao_postgresql.patch` (copie o arquivo .patch para a raiz antes). Não deve dar erro.
2. Na raiz do repositório: `docker compose up --build`
3. Aguarde ~30 s. Abra no navegador (cada um vira um print):
   - http://localhost:3000/api/health  -> {"status":"ok","database":"up"}
   - http://localhost:3000/api/measurements?limit=5  -> leituras gravadas (do mais recente ao mais antigo)
   - http://localhost:3000/api/measurements/summary  -> quantidade, média, mínima, máxima (use ?from=AAAA-MM-DD&to=AAAA-MM-DD; o limite final é exclusivo)
4. Print do banco: `docker exec -it postgres psql -U postgres -d sensorhub -c "SELECT id, temperature, humidity, luminosity, created_at FROM measurements ORDER BY id DESC LIMIT 10;"`
5. Prova de persistência: `docker compose restart backend`, repita o summary do passo 3. A quantidade não zera.
6. Com o ESP32 real (Matheus): rode sem o serviço mock-device, com o broker acessível, e repita 3 e 4. Se o device_id precisar ser outro: variável DEVICE_ID no backend.

## Tela de histórico (dashboard)
Abra http://localhost:8080, role até "Histórico por período (banco de dados)", ajuste De/Até e clique em Consultar. Tire print da tela com os resumos e o gráfico (Figura do relatório).

## Teste em um comando (gera o texto para os prints)
`bash testar_integracao.sh | tee resultado_testes.txt` (precisa da stack no ar). Ele roda saúde, gravação, consulta, resumo, data inválida, reinício do backend e banco fora do ar, e exporta `medicoes.csv`.

## Análise dos dados (Quadro 14 e Figuras 13 e 14)
`pip install pandas matplotlib` e depois `python3 analise_medicoes.py medicoes.csv`. Gera estatisticas.csv, fig13_serie_temporal.png e fig14_distribuicao.png. Use medições reais (simulador ou ESP32) e diga no relatório qual fonte foi usada.

## Publicar no GitHub (depois de testar)
```
git add -A
git commit -m "feat: persistência em PostgreSQL e tela de histórico"
git push origin feat/postgres-historico
```
Depois abra o Pull Request e faça o merge na branch principal. Avise o Jeferson quando terminar, com o link do commit ou da branch.

## Observações
- `synchronize: true` cria a tabela sozinha (uso acadêmico). Em produção usaria migrations.
- Se o banco cair, o backend continua recebendo telemetria; /api/health mostra "degraded".
