import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { calcularClassificacao } from './domain/simulacao.js';
import { contratoPatrocinioConhecido, patrocinadoresDisponiveis } from './domain/patrocinios.js';

const { Pool } = pg;
const banco = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

async function buscarRegras() {
  const consulta = await banco.query('SELECT chave, valor FROM regras');
  return Object.fromEntries(consulta.rows.map(regra => [regra.chave, regra.valor]));
}

async function buscarDadosDaSerie(serie) {
  const [pilotos, resultados] = await Promise.all([
    banco.query(`SELECT p.id,p.nome,p.patrocinador,p.etapa_patrocinio,se.nome AS serie
      FROM pilotos p JOIN series se ON se.id=p.serie_id
      WHERE se.nome=$1 AND p.ativo ORDER BY p.nome`, [serie]),
    banco.query(`SELECT r.piloto_id,r.etapa_id,r.posicao,r.pontos,r.pole,r.vmr,r.etapa_patrocinio,r.penalidade
      FROM resultados r JOIN pilotos p ON p.id=r.piloto_id JOIN series se ON se.id=p.serie_id
      WHERE se.nome=$1`, [serie]),
  ]);
  return { pilotos: pilotos.rows, resultados: resultados.rows };
}

app.get('/api/health', async (_req, res) => {
  try { await banco.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

app.get('/api/series', async (_req, res) => {
  const consulta = await banco.query('SELECT id,nome FROM series ORDER BY nome');
  res.json(consulta.rows);
});

app.get('/api/series/:serie/pilotos', async (req, res) => {
  const { pilotos } = await buscarDadosDaSerie(req.params.serie.toUpperCase());
  res.json(pilotos);
});

app.get('/api/etapas', async (_req, res) => {
  const consulta = await banco.query('SELECT id,numero,nome FROM etapas ORDER BY numero');
  res.json(consulta.rows);
});

app.get('/api/regras', async (_req, res) => res.json(await buscarRegras()));
app.get('/api/patrocinios', (_req, res) => res.json([
  ...patrocinadoresDisponiveis.map(nome => ({ nome, regra: 'contrato' })),
  { nome: 'Elf', regra: 'padrao' },
]));

app.get('/api/series/:serie/classificacao', async (req, res) => {
  const serie = req.params.serie.toUpperCase();
  const { pilotos, resultados } = await buscarDadosDaSerie(serie);
  const classificacao = calcularClassificacao(pilotos, resultados);
  const maiorEtapaRegistrada = Math.max(0, ...resultados.map(r => Number(r.etapa_id)));
  res.json({ pilotos, resultados, classificacao, maiorEtapaRegistrada });
});

app.post('/api/simular', async (req, res) => {
  try {
    const { serie, etapa, previsoes = {}, selecionado } = req.body;
    const numeroEtapa = Number(etapa);
    if (![7, 8].includes(numeroEtapa)) return res.status(400).json({ erro: 'Selecione uma das duas etapas restantes: 7 ou 8.' });
    const { pilotos, resultados } = await buscarDadosDaSerie(String(serie).toUpperCase());
    const regras = await buscarRegras();
    const posicoes = pilotos.map(piloto => Number(previsoes[piloto.id]?.posicao));
    if (posicoes.some(posicao => !Number.isInteger(posicao) || posicao < 1 || posicao > pilotos.length)) {
      return res.status(400).json({ erro: `Informe uma posição inteira entre 1 e ${pilotos.length} para cada piloto.` });
    }
    if (new Set(posicoes).size !== posicoes.length) {
      return res.status(400).json({ erro: 'Cada piloto precisa ter uma posição de chegada diferente.' });
    }
    const grids = pilotos.map(piloto => Number(previsoes[piloto.id]?.grid))
      .filter(grid => Number.isInteger(grid) && grid > 0);
    if (grids.some(grid => grid > pilotos.length)) {
      return res.status(400).json({ erro: `O grid deve ser uma posição entre 1 e ${pilotos.length}.` });
    }
    if (new Set(grids).size !== grids.length) {
      return res.status(400).json({ erro: 'Cada posição de grid pode ser ocupada por apenas um piloto.' });
    }
    const pilotosP1 = pilotos.filter(piloto => previsoes[piloto.id]?.pole);
    const pilotosVmr = pilotos.filter(piloto => previsoes[piloto.id]?.vmr);
    if (pilotosP1.length > 1 || pilotosVmr.length > 1) {
      return res.status(400).json({ erro: 'Só pode haver um piloto com P1 e um com VMR por etapa.' });
    }
    if (pilotosP1.some(piloto => Number(previsoes[piloto.id]?.grid) !== 1)
      || pilotos.some(piloto => Number(previsoes[piloto.id]?.grid) === 1 && !previsoes[piloto.id]?.pole)) {
      return res.status(400).json({ erro: 'P1 deve corresponder ao piloto que larga na posição 1 do grid.' });
    }
    if (numeroEtapa === 7) {
      const pendentes = pilotos.filter(piloto => !resultados.some(resultado =>
        Number(resultado.piloto_id) === Number(piloto.id) && resultado.etapa_patrocinio,
      ));
      for (const piloto of pendentes) {
        const previsao = previsoes[piloto.id] || {};
        if (contratoPatrocinioConhecido(previsao.patrocinador)
          && (!Number.isInteger(Number(previsao.grid)) || Number(previsao.grid) < 1 || Number(previsao.grid) > pilotos.length)) {
          return res.status(400).json({ erro: `Informe o grid de largada de ${piloto.nome} para calcular o bônus do patrocínio.` });
        }
      }
    }
    const classificacao = calcularClassificacao(pilotos, resultados, {
      etapaSimulada: numeroEtapa,
      previsoes,
      descartes: Number(regras.etapas_descontadas ?? 2),
      pontosPorPosicao: regras.pontos_por_posicao ?? [],
      bonusFinal: regras.bonus_final ?? [],
    });
    const pilotoSelecionado = classificacao.find(piloto => Number(piloto.id) === Number(selecionado));
    res.json({
      classificacao,
      selecionado: pilotoSelecionado,
      top3: Number(pilotoSelecionado?.colocacao) <= 3,
      campeao: Number(pilotoSelecionado?.colocacao) === 1,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao calcular a simulação.', detalhe: erro.message });
  }
});

app.listen(process.env.PORT || 3001, '0.0.0.0', () => console.log('API da Liga GT disponível na porta 3001'));
