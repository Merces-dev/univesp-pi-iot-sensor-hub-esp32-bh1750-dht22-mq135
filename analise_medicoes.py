#!/usr/bin/env python3
"""Análise descritiva das medições do Sensor Hub (Quadro 14 e Figuras 13-14 do relatório).

Uso:  python3 analise_medicoes.py medicoes.csv
Requer: pip install pandas matplotlib
Gera: estatisticas.csv, fig13_serie_temporal.png, fig14_distribuicao.png e imprime o resumo.
"""
import sys
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

arq = sys.argv[1] if len(sys.argv) > 1 else "medicoes.csv"
df = pd.read_csv(arq)
col_t = "created_at" if "created_at" in df.columns else "createdAt"
df[col_t] = pd.to_datetime(df[col_t], utc=True).dt.tz_convert("America/Sao_Paulo")
df = df.sort_values(col_t)

vars_ = {"temperature": "Temperatura (°C)", "humidity": "Umidade (%)",
         "luminosity": "Luminosidade (lx)", "air_quality": "Qualidade do ar (índice)"}
vars_ = {k: v for k, v in vars_.items() if k in df.columns}

# Limpeza: remove linhas sem valor e duplicadas, e informa quanto foi descartado
n0 = len(df)
df = df.drop_duplicates(subset=[col_t] + list(vars_)).dropna(subset=list(vars_))
print(f"Registros lidos: {n0} | após limpeza: {len(df)} | descartados: {n0 - len(df)}")
print(f"Período: {df[col_t].min():%d/%m/%Y %H:%M:%S} a {df[col_t].max():%d/%m/%Y %H:%M:%S}")

est = df[list(vars_)].agg(["count", "mean", "median", "std", "min", "max"]).T
est.columns = ["n", "média", "mediana", "desvio padrão", "mínimo", "máximo"]
est.index = [vars_[i] for i in est.index]
est = est.round(2)
est.to_csv("estatisticas.csv", encoding="utf-8-sig")
print(est.to_string())

if len(vars_) >= 2:
    corr = df[list(vars_)].corr().round(2)
    print("\nCorrelação de Pearson:\n", corr.to_string())
    if {"temperature", "humidity"} <= set(vars_):
        print(f"\nTemperatura x umidade: r = {corr.loc['temperature','humidity']}")

fig, ax = plt.subplots(len(vars_), 1, figsize=(9, 2.4 * len(vars_)), sharex=True)
ax = [ax] if len(vars_) == 1 else ax
for a, (k, nome) in zip(ax, vars_.items()):
    a.plot(df[col_t], df[k], lw=1.2)
    a.set_ylabel(nome, fontsize=8); a.grid(alpha=.3)
ax[-1].set_xlabel("Horário")
fig.suptitle("Série temporal das medições", fontsize=10)
fig.tight_layout(); fig.savefig("fig13_serie_temporal.png", dpi=200); plt.close(fig)

fig, ax = plt.subplots(1, len(vars_), figsize=(3 * len(vars_), 2.8))
ax = [ax] if len(vars_) == 1 else ax
for a, (k, nome) in zip(ax, vars_.items()):
    a.hist(df[k], bins=15, edgecolor="white"); a.set_xlabel(nome, fontsize=8); a.set_ylabel("Frequência", fontsize=8)
fig.suptitle("Distribuição das medições", fontsize=10)
fig.tight_layout(); fig.savefig("fig14_distribuicao.png", dpi=200); plt.close(fig)
print("\nGerados: estatisticas.csv, fig13_serie_temporal.png, fig14_distribuicao.png")
