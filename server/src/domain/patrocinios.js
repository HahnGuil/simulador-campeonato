// Metas e bônus transcritos dos contratos da Temporada 7.
const contratos = {
  Advan: [
    { descricao: 'Subir 3 ou mais posições', tipo: 'subida', minimo: 3, pontos: 2 },
    { descricao: 'Terminar entre os 5 primeiros', tipo: 'chegada', maximo: 5, pontos: 1 },
    { descricao: 'Grid entre os 7 primeiros', tipo: 'grid', maximo: 7, pontos: 1 },
  ],
  Falken: [
    { descricao: 'Grid entre os 2 primeiros', tipo: 'grid', maximo: 2, pontos: 2 },
    { descricao: 'Terminar entre os 3 primeiros', tipo: 'chegada', maximo: 3, pontos: 2 },
    { descricao: 'Conquistar a volta mais rápida', tipo: 'vmr', pontos: 1 },
  ],
  Hankook: [
    { descricao: 'Subir 4 ou mais posições', tipo: 'subida', minimo: 4, pontos: 2 },
    { descricao: 'Terminar entre os 8 primeiros', tipo: 'chegada', maximo: 8, pontos: 1 },
    { descricao: 'Grid entre os 10 primeiros', tipo: 'grid', maximo: 10, pontos: 1 },
  ],
  Martini: [
    { descricao: 'Subir 3 ou mais posições', tipo: 'subida', minimo: 3, pontos: 2 },
    { descricao: 'Terminar entre os 8 primeiros', tipo: 'chegada', maximo: 8, pontos: 1 },
    { descricao: 'Grid entre os 8 primeiros', tipo: 'grid', maximo: 8, pontos: 1 },
  ],
  Michelin: [
    { descricao: 'Terminar entre os 5 primeiros', tipo: 'chegada', maximo: 5, pontos: 2 },
    { descricao: 'Subir 3 ou mais posições', tipo: 'subida', minimo: 3, pontos: 1 },
    { descricao: 'Grid entre os 7 primeiros', tipo: 'grid', maximo: 7, pontos: 1 },
  ],
  'Monster Energy': [
    { descricao: 'Terminar entre os 3 primeiros', tipo: 'chegada', maximo: 3, pontos: 2 },
    { descricao: 'Grid entre os 4 primeiros', tipo: 'grid', maximo: 4, pontos: 2 },
    { descricao: 'Subir 2 ou mais posições', tipo: 'subida', minimo: 2, pontos: 1 },
  ],
  'Red Bull': [
    { descricao: 'Terminar entre os 3 primeiros', tipo: 'chegada', maximo: 3, pontos: 3 },
    { descricao: 'Conquistar a volta mais rápida', tipo: 'vmr', pontos: 1 },
    { descricao: 'Grid entre os 5 primeiros', tipo: 'grid', maximo: 5, pontos: 1 },
  ],
  'Shell V-Power': [
    { descricao: 'Subir 4 ou mais posições', tipo: 'subida', minimo: 4, pontos: 2 },
    { descricao: 'Terminar entre os 8 primeiros', tipo: 'chegada', maximo: 8, pontos: 1 },
    { descricao: 'Grid entre os 10 primeiros', tipo: 'grid', maximo: 10, pontos: 1 },
  ],
};

export const patrocinadoresDisponiveis = Object.keys(contratos);

export function contratoPatrocinioConhecido(nome) {
  return Boolean(contratos[String(nome || '').trim()]);
}

export function calcularBonusPatrocinio(nome, previsao) {
  const patrocinador = String(nome || '').trim();
  const contrato = contratos[patrocinador];
  if (!contrato) {
    return { pontos: 5, metas: [{ descricao: 'Bônus padrão: contrato não informado', atendida: true, pontos: 5 }] };
  }

  const chegada = Number(previsao.posicao);
  const grid = Number(previsao.grid);
  const vmr = Boolean(previsao.vmr);
  const subida = grid - chegada;
  const metas = contrato.map(meta => {
    let atendida = false;
    if (meta.tipo === 'chegada') atendida = chegada <= meta.maximo;
    if (meta.tipo === 'grid') atendida = Number.isInteger(grid) && grid <= meta.maximo;
    if (meta.tipo === 'subida') atendida = Number.isInteger(grid) && subida >= meta.minimo;
    if (meta.tipo === 'vmr') atendida = vmr;
    return { descricao: meta.descricao, atendida, pontos: meta.pontos };
  });
  const metasCumpridas = metas.filter(meta => meta.atendida);
  const bonusIntegral = metasCumpridas.length === metas.length ? 1 : 0;
  return {
    pontos: metasCumpridas.reduce((total, meta) => total + meta.pontos, 0) + bonusIntegral,
    metas: [...metasCumpridas, ...(bonusIntegral ? [{ descricao: 'Bônus de cumprimento integral', atendida: true, pontos: 1 }] : [])],
  };
}
