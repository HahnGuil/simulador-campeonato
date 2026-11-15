// Serviço de domínio: projeta os pontos, aplica descartes válidos e resolve empates.
export function calcularClassificacao(pilotos, resultados, configuracao = {}) {
  const { etapaSimulada, previsoes = {}, descartes = 0, pontosPorPosicao = [], bonusFinal = [] } = configuracao;
  const classificacao = pilotos.map(piloto => {
    const corridas = resultados
      .filter(resultado => Number(resultado.piloto_id) === Number(piloto.id))
      .map(resultado => ({ ...resultado, etapa_id: Number(resultado.etapa_id), pontos: Number(resultado.pontos) }));
    const chegada = previsoes[piloto.id];
    if (chegada != null) {
      const previsao = typeof chegada === 'object' ? chegada : { posicao: chegada };
      const posicao = Number(previsao.posicao);
      const pole = Boolean(previsao.pole);
      const vmr = Boolean(previsao.vmr);
      const pontosBase = Number(pontosPorPosicao[posicao - 1] || 0);
      const pontosExtraFinal = Number(etapaSimulada) === 8 ? Number(bonusFinal[posicao - 1] || 0) : 0;
      corridas.push({
        etapa_id: Number(etapaSimulada),
        posicao,
        pontos: pontosBase + pontosExtraFinal + Number(pole) + Number(vmr),
        pole,
        vmr,
        etapa_patrocinio: false,
        simulada: true,
      });
    }
    const elegiveis = corridas
      .filter(corrida => corrida.etapa_id >= 2 && corrida.etapa_id <= 7 && !corrida.etapa_patrocinio)
      .sort((a, b) => a.pontos - b.pontos || b.etapa_id - a.etapa_id)
      .slice(0, Math.min(descartes, corridas.filter(c => c.etapa_id >= 2 && c.etapa_id <= 7 && !c.etapa_patrocinio).length));
    const idsDescartados = new Set(elegiveis.map(corrida => corrida.etapa_id));
    const pontuaveis = corridas.filter(corrida => !idsDescartados.has(corrida.etapa_id));
    const vitorias = Array.from({ length: 14 }, (_, indice) =>
      corridas.filter(corrida => Number(corrida.posicao) === indice + 1).length,
    );
    return {
      ...piloto,
      total: pontuaveis.reduce((total, corrida) => total + corrida.pontos, 0),
      corridas,
      descartes: elegiveis,
      vitorias,
      poles: corridas.filter(corrida => corrida.pole).length,
      voltasRapidas: corridas.filter(corrida => corrida.vmr).length,
    };
  });

  classificacao.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let indice = 0; indice < 14; indice++) {
      if (b.vitorias[indice] !== a.vitorias[indice]) return b.vitorias[indice] - a.vitorias[indice];
    }
    return b.poles - a.poles || b.voltasRapidas - a.voltasRapidas || a.nome.localeCompare(b.nome, 'pt-BR');
  });
  return classificacao.map((piloto, indice) => ({ ...piloto, colocacao: indice + 1 }));
}
