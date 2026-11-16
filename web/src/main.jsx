import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, ChevronDown, Database, Flag, FlagTriangleRight, RefreshCw, Search, Target, Trophy } from 'lucide-react';
import './style.css';

const API = 'http://localhost:3001/api';

function formatarPontos(valor) {
  return Math.round(Number(valor || 0)).toString();
}

function TabelaClassificacao({ titulo, pilotos, selecionado, completa = false, projetada = false }) {
  const lider = Number(pilotos[0]?.total || 0);
  return (
    <section className={`ranking-panel ${completa ? 'ranking-full' : ''}`}>
      <div className="table-heading"><span>{titulo}</span><span>{pilotos.length} PILOTOS</span></div>
      <div className="ranking-scroll">
        <table>
          <thead><tr><th>POS</th><th>PILOTO</th><th>PTS</th><th>BÔNUS PATROCÍNIO</th><th>DESCARTES / PROTEGIDAS</th><th>GAP LÍDER</th><th>GAP FRENTE</th></tr></thead>
          <tbody>
            {pilotos.map((piloto, indice) => {
              const anterior = pilotos[indice - 1];
              const descartes = piloto.descartes || [];
              const protegidas = piloto.etapasProtegidas || [];
              const corridaSimulada = piloto.corridas?.find(corrida => corrida.simulada);
              const metasPatrocinio = corridaSimulada?.patrocinio_metas || [];
              const descarteTexto = descartes.length
                ? descartes.map(item => `E${item.etapa_id} (${formatarPontos(item.pontos)} pts)`).join(' · ')
                : '—';
              const protegidasTexto = protegidas.map(item => `E${item.etapa_id}${item.etapa_patrocinio ? ' patrocínio' : ''}`).join(' · ');
              return (
                <tr className={Number(piloto.id) === Number(selecionado) ? 'selected-row' : ''} key={piloto.id}>
                  <td className="rank">{String(indice + 1).padStart(2, '0')}</td>
                  <td className="rank-name">{piloto.nome}</td>
                  <td className="points-cell">{formatarPontos(piloto.total)}</td>
                  <td className="sponsor-points">{projetada && corridaSimulada?.etapa_patrocinio ? <><b>+{formatarPontos(piloto.patrocinioPontos)} · {piloto.patrocinioNome}</b><small>{metasPatrocinio.length ? metasPatrocinio.map(meta => `+${meta.pontos} ${meta.descricao}`).join(' · ') : 'Nenhuma meta de bônus atingida'}</small></> : '—'}</td>
                  <td className="drop-cell" title={`Descartes: ${descarteTexto}. Protegidas: ${protegidasTexto || 'nenhuma registrada'}`}><span>Descartes: {descarteTexto}</span>{protegidas.length > 0 && <small className="protected-list">Protegidas: {protegidasTexto}</small>}</td>
                  <td className="gap-cell">{formatarPontos(lider - Number(piloto.total || 0))}</td>
                  <td className="gap-cell">{anterior ? formatarPontos(Number(anterior.total || 0) - Number(piloto.total || 0)) : '—'}</td>
                </tr>
              );
            })}
            {!pilotos.length && <tr><td className="empty-cell" colSpan="7">Nenhum resultado disponível.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="gap-legend">Gaps = pontos que faltam para alcançar o líder ou o piloto imediatamente à frente.</div>
    </section>
  );
}

function App() {
  const [serie, setSerie] = useState('A');
  const [etapas, setEtapas] = useState([]);
  const [etapa, setEtapa] = useState(7);
  const [pilotos, setPilotos] = useState([]);
  const [patrocinadores, setPatrocinadores] = useState([]);
  const [classificacaoAtual, setClassificacaoAtual] = useState([]);
  const [regras, setRegras] = useState({});
  const [selecionado, setSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState({});
  const [gridPorPiloto, setGridPorPiloto] = useState({});
  const [patrocinioPorPiloto, setPatrocinioPorPiloto] = useState({});
  const [marcas, setMarcas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/etapas`).then(resposta => resposta.json()),
      fetch(`${API}/regras`).then(resposta => resposta.json()),
      fetch(`${API}/patrocinios`).then(resposta => resposta.json()),
    ]).then(([listaEtapas, listaRegras, listaPatrocinios]) => {
      setEtapas(listaEtapas);
      setEtapa(listaEtapas.find(item => item.numero === 7)?.numero || 7);
      setRegras(listaRegras);
      setPatrocinadores(listaPatrocinios);
    }).catch(() => setErro('API indisponível. Inicie os serviços com docker compose up --build.'));
  }, []);

  useEffect(() => {
    setResultado(null);
    fetch(`${API}/series/${serie}/classificacao`)
      .then(resposta => resposta.json())
      .then(dados => {
        const porClassificacao = dados.classificacao
          .map(item => dados.pilotos.find(piloto => Number(piloto.id) === Number(item.id)))
          .filter(Boolean);
        setPilotos(porClassificacao);
        setClassificacaoAtual(dados.classificacao);
        setSelecionado(porClassificacao[0]?.id || null);
        setOrdem(Object.fromEntries(porClassificacao.map((piloto, indice) => [piloto.id, String(indice + 1)])));
        setGridPorPiloto({});
        setPatrocinioPorPiloto(Object.fromEntries(porClassificacao.map(piloto => [piloto.id, piloto.patrocinador || ''])));
        setMarcas({});
      })
      .catch(() => setErro('Não foi possível carregar a classificação desta série.'));
  }, [serie]);

  const etapasRestantes = etapas.filter(item => item.numero === 7 || item.numero === 8);
  const contagemPosicoes = pilotos.reduce((contagem, piloto) => {
    const posicao = Number(ordem[piloto.id]);
    if (Number.isInteger(posicao)) contagem[posicao] = (contagem[posicao] || 0) + 1;
    return contagem;
  }, {});
  const posicoesRepetidas = new Set(Object.entries(contagemPosicoes)
    .filter(([, quantidade]) => quantidade > 1)
    .map(([posicao]) => Number(posicao)));
  const classificacaoExibida = resultado?.classificacao || classificacaoAtual;
  const pilotoProjetado = resultado?.selecionado;
  const posicaoProjetada = classificacaoExibida.findIndex(piloto => Number(piloto.id) === Number(selecionado)) + 1;
  const pilotosFiltrados = pilotos.filter(piloto => piloto.nome.toLowerCase().includes(busca.toLowerCase()));
  const distanciaPodio = pilotoProjetado && resultado.classificacao.length >= 3
    ? Math.max(0, Number(resultado.classificacao[2].total) - Number(pilotoProjetado.total) + 1)
    : 0;
  const distanciaTitulo = pilotoProjetado && resultado.classificacao.length
    ? Math.max(0, Number(resultado.classificacao[0].total) - Number(pilotoProjetado.total) + 1)
    : 0;

  function restaurarTabela() {
    setOrdem(Object.fromEntries(classificacaoAtual.map((piloto, indice) => [piloto.id, String(indice + 1)])));
    setGridPorPiloto({});
    setMarcas({});
    setPatrocinioPorPiloto(Object.fromEntries(pilotos.map(piloto => [piloto.id, piloto.patrocinador || ''])));
    setResultado(null);
    setErro('');
  }

  function confirmarPosicao(pilotoId, valorDigitado) {
    const novaPosicao = Number(valorDigitado);
    const posicaoAnterior = Number(ordem[pilotoId]);
    if (!Number.isInteger(novaPosicao) || novaPosicao < 1 || novaPosicao > pilotos.length) return;
    const pilotoNaPosicao = pilotos.find(piloto =>
      Number(piloto.id) !== Number(pilotoId) && Number(ordem[piloto.id]) === novaPosicao,
    );
    if (pilotoNaPosicao && Number.isInteger(posicaoAnterior)) {
      setOrdem({
        ...ordem,
        [pilotoNaPosicao.id]: String(posicaoAnterior),
        [pilotoId]: String(novaPosicao),
      });
      return;
    }
    setOrdem({ ...ordem, [pilotoId]: String(novaPosicao) });
  }

  function navegarEntrePosicoes(evento, pilotoId) {
    if (evento.key !== 'ArrowUp' && evento.key !== 'ArrowDown') return;
    evento.preventDefault();
    const indiceAtual = pilotosFiltrados.findIndex(piloto => Number(piloto.id) === Number(pilotoId));
    const deslocamento = evento.key === 'ArrowUp' ? -1 : 1;
    const pilotoAlvo = pilotosFiltrados[indiceAtual + deslocamento];
    if (pilotoAlvo) document.getElementById(`posicao-piloto-${pilotoAlvo.id}`)?.focus();
  }

  async function simular() {
    setErro('');
    if (!selecionado) {
      setErro('Selecione o piloto que deseja acompanhar.');
      return;
    }
    const posicoes = pilotos.map(piloto => Number(ordem[piloto.id]));
    if (posicoes.some(posicao => !Number.isInteger(posicao) || posicao < 1 || posicao > pilotos.length)) {
      setErro(`Informe uma posição inteira entre 1 e ${pilotos.length} para cada piloto.`);
      return;
    }
    if (posicoesRepetidas.size) {
      setErro('Há pilotos na mesma posição. Cada colocação deve ser única.');
      return;
    }
    const pilotosP1 = pilotos.filter(piloto => marcas[piloto.id]?.pole);
    const pilotosVmr = pilotos.filter(piloto => marcas[piloto.id]?.vmr);
    if (pilotosP1.length > 1 || pilotosVmr.length > 1) {
      setErro('Só pode haver um piloto com P1 e um com VMR por etapa.');
      return;
    }
    if (pilotosP1.some(piloto => Number(gridPorPiloto[piloto.id]) !== 1)
      || pilotos.some(piloto => Number(gridPorPiloto[piloto.id]) === 1 && !marcas[piloto.id]?.pole)) {
      setErro('P1 deve corresponder ao piloto que larga na posição 1 do grid.');
      return;
    }
    const gridsInformados = pilotos.map(piloto => Number(gridPorPiloto[piloto.id])).filter(grid => Number.isInteger(grid) && grid > 0);
    if (new Set(gridsInformados).size !== gridsInformados.length) {
      setErro('Cada posição de grid pode ser ocupada por apenas um piloto.');
      return;
    }
    if (Number(etapa) === 7) {
      const pilotoSemGrid = pilotos.find(piloto => !piloto.etapa_patrocinio
        && Boolean(patrocinioPorPiloto[piloto.id])
        && patrocinadores.some(item => item.regra === 'contrato' && item.nome === patrocinioPorPiloto[piloto.id])
        && (!Number.isInteger(Number(gridPorPiloto[piloto.id])) || Number(gridPorPiloto[piloto.id]) < 1 || Number(gridPorPiloto[piloto.id]) > pilotos.length));
      if (pilotoSemGrid) {
        setErro(`Informe o grid de largada de ${pilotoSemGrid.nome} para calcular o bônus do patrocínio.`);
        return;
      }
    }
    const previsoes = Object.fromEntries(pilotos.map(piloto => [piloto.id, {
      posicao: Number(ordem[piloto.id]),
      grid: Number(gridPorPiloto[piloto.id]),
      pole: Boolean(marcas[piloto.id]?.pole),
      vmr: Boolean(marcas[piloto.id]?.vmr),
      patrocinador: patrocinioPorPiloto[piloto.id] || '',
    }]));
    try {
      const resposta = await fetch(`${API}/simular`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serie, etapa, previsoes, selecionado }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível calcular a projeção.');
      setResultado(dados);
    } catch (falha) {
      setErro(falha.message || 'Não foi possível calcular a simulação.');
    }
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand"><span className="brand-icon"><Flag size={20} /></span><span>GT<span className="brand-green">.</span></span></div>
        <div className="rail-tag">LIGA NACIONAL<br />2026</div>
        <div className="rail-bottom">SIMULADOR<br />DE PONTOS</div>
      </aside>
      <main>
        <header>
          <div className="eyebrow">CAMPEONATO · TEMPORADA 2026</div>
          <div className="headrow">
            <div><h1>Simulador de pontos</h1><p>Projete cenários e acompanhe a disputa pelo título.</p></div>
            <div className="live"><i /> DADOS SALVOS NO POSTGRES</div>
          </div>
        </header>

        <section className="controls">
          <div className="field"><label>SÉRIE</label><div className="selectwrap"><select value={serie} onChange={evento => setSerie(evento.target.value)}><option>A</option><option>B</option><option>C</option></select><ChevronDown size={16} /></div></div>
          <div className="field"><label>ETAPA A SIMULAR</label><div className="selectwrap"><select value={etapa} onChange={evento => setEtapa(Number(evento.target.value))}>{etapasRestantes.map(item => <option value={item.numero} key={item.id}>Etapa {item.numero} · {item.nome}</option>)}</select><ChevronDown size={16} /></div></div>
          <div className="field pilot-field"><label>PILOTO EM FOCO</label><div className="selectwrap"><select value={selecionado || ''} onChange={evento => setSelecionado(Number(evento.target.value))}>{pilotos.map(piloto => <option key={piloto.id} value={piloto.id}>{piloto.nome}</option>)}</select><ChevronDown size={16} /></div></div>
          <button className="run" onClick={simular}><Target size={17} /> Simular cenário</button>
        </section>

        <div className="data-note"><Database size={15} /><span>Os resultados detalhados da planilha vão até a Etapa 4 na Série A e a Etapa 5 nas Séries B e C. A simulação usa as posições digitadas, P1 (pole), VMR e os bônus previstos para a etapa.</span></div>
        {Number(etapa) === 8 && pilotos.some(piloto => !piloto.etapa_patrocinio) && <div className="data-note sponsor-note"><AlertTriangle size={15} /><span>Os contratos pendentes devem ser cumpridos em Tokyo (Etapa 7). Para calcular os bônus de patrocinador, simule a Etapa 7; os pontos dessa etapa ainda não constam no histórico da planilha.</span></div>}

        <section className="content">
          <div className="scenario">
            <div className="section-head">
              <div><span className="step">01 / CENÁRIO</span><h2>Posição dos pilotos</h2></div>
              <button className="reset-table" onClick={restaurarTabela}><RefreshCw size={13} /> Resetar tabela</button>
            </div>
            <div className="search"><Search size={15} /><input placeholder="Buscar piloto..." value={busca} onChange={evento => setBusca(evento.target.value)} /></div>
            <div className="pilot-list">
              <div className="pilot-head"><span>PILOTO</span><span>GRID</span><span>CHEGADA</span><span>PATROCÍNIO</span><span>BÔNUS</span></div>
              <div className="pilots">
                {pilotosFiltrados.map(piloto => {
                  const emFoco = Number(selecionado) === Number(piloto.id);
                  const posicao = Number(ordem[piloto.id]);
                  const repetida = posicoesRepetidas.has(posicao);
                  const marca = marcas[piloto.id] || {};
                  const dadosAtuais = classificacaoAtual.find(item => Number(item.id) === Number(piloto.id));
                  const patrocinioCumprido = Boolean(piloto.etapa_patrocinio);
                  const podeEscolherPatrocinio = Number(etapa) === 7 && !patrocinioCumprido;
                  return (
                    <div className={`pilot ${emFoco ? 'focus' : ''} ${repetida ? 'duplicate' : ''}`} key={piloto.id}>
                      <label className="check" title="Selecionar piloto para acompanhar"><input type="radio" name="pilotoEmFoco" checked={emFoco} onChange={() => setSelecionado(piloto.id)} /><span /></label>
                      <div className="avatar">{piloto.nome.split(' ').map(nome => nome[0]).slice(0, 2).join('').toUpperCase()}</div>
                      <div className="pilot-name"><b>{piloto.nome}</b><small>#{String(dadosAtuais?.colocacao || '—').padStart(2, '0')} NO CAMPEONATO · {formatarPontos(dadosAtuais?.total)} PTS</small></div>
                      <label className="grid-field"><input type="number" min="1" max={pilotos.length} step="1" value={gridPorPiloto[piloto.id] ?? ''} aria-label={`Posição no grid de ${piloto.nome}`} onChange={evento => setGridPorPiloto({ ...gridPorPiloto, [piloto.id]: evento.target.value })} /></label>
                      <label className="position-field"><input id={`posicao-piloto-${piloto.id}`} type="text" inputMode="numeric" pattern="[0-9]*" value={ordem[piloto.id] ?? ''} aria-label={`Posição de chegada de ${piloto.nome}`} onFocus={evento => evento.currentTarget.select()} onClick={evento => evento.currentTarget.select()} onChange={evento => setOrdem({ ...ordem, [piloto.id]: evento.target.value })} onBlur={evento => confirmarPosicao(piloto.id, evento.target.value)} onKeyDown={evento => navegarEntrePosicoes(evento, piloto.id)} /></label>
                      <div className={`sponsor-choice ${!podeEscolherPatrocinio ? 'inactive' : ''}`}>
                        <select aria-label={`Patrocínio de ${piloto.nome}`} value={patrocinioPorPiloto[piloto.id] ?? ''} disabled={!podeEscolherPatrocinio} onChange={evento => setPatrocinioPorPiloto({ ...patrocinioPorPiloto, [piloto.id]: evento.target.value })}>
                          <option value="">Não informado · +5 pts</option>
                          {patrocinadores.map(item => <option value={item.nome} key={item.nome}>{item.nome}{item.regra === 'padrao' ? ' · +5 pts (sem contrato)' : ''}</option>)}
                        </select><ChevronDown size={13} />
                      </div>
                      <div className="race-checks">
                        <label title="Pole position na qualificação"><input type="checkbox" checked={Boolean(marca.pole)} onChange={evento => setMarcas({ ...marcas, [piloto.id]: { ...marca, pole: evento.target.checked } })} /><span>P1</span></label>
                        <label title="Volta mais rápida da corrida"><input type="checkbox" checked={Boolean(marca.vmr)} onChange={evento => setMarcas({ ...marcas, [piloto.id]: { ...marca, vmr: evento.target.checked } })} /><span>VMR</span></label>
                      </div>
                    </div>
                  );
                })}
                {!pilotos.length && <div className="empty"><Database size={20} /> Nenhum piloto cadastrado para a Série {serie}.</div>}
                {!pilotosFiltrados.length && pilotos.length > 0 && <div className="empty">Nenhum piloto corresponde à busca.</div>}
              </div>
            </div>
            {posicoesRepetidas.size > 0 && <div className="inline-warning"><AlertTriangle size={14} /> Corrija as posições repetidas antes de simular.</div>}
            <div className="footnote"><AlertTriangle size={14} /> Grid calcula quali e posições ganhas. P1 e VMR somam 1 ponto cada; contratos pendentes em Tokyo recebem os bônus conforme as metas.</div>
          </div>

          <aside className="results">
            <div className="section-head"><div><span className="step">02 / PROJEÇÃO</span><h2>Resultado da simulação</h2></div></div>
            {resultado && pilotoProjetado ? (
              <>
                <div className="hero-result">
                  <div className="trophy"><Trophy size={21} /></div>
                  <div><span>PROJEÇÃO DO PILOTO</span><strong>{posicaoProjetada}º <small>lugar</small></strong></div>
                  <div className="hero-points"><b>{formatarPontos(pilotoProjetado.total)}</b><small>PTS</small></div>
                </div>
                <div className="possibility"><b>Top 3 {resultado.top3 ? 'alcançado' : 'fora do top 3'}</b><span>{resultado.top3 ? 'Com esse resultado, termina no Top 3 projetado.' : etapa === 7 ? `Faltam ${distanciaPodio} ponto(s) para ultrapassar o 3º colocado. A Etapa 8 ainda pode mudar o pódio.` : `Faltam ${distanciaPodio} ponto(s) para ultrapassar o 3º colocado; a Etapa 8 encerra o campeonato.`}</span></div>
                <div className="possibility champion"><b>{resultado.campeao ? 'Campeão no cenário' : 'Caminho para o título'}</b><span>{resultado.campeao ? 'Este cenário termina com o piloto campeão.' : etapa === 7 ? distanciaTitulo <= 54 ? `Ainda pode buscar o título: precisa tirar ${distanciaTitulo} ponto(s) do líder; a Etapa 8 vale até 54 pontos contando P1 e VMR.` : 'Com este cenário, a diferença para o líder excede os 54 pontos possíveis somando chegada, bônus final, P1 e VMR na Etapa 8.' : `Faltam ${distanciaTitulo} ponto(s) para alcançar o líder na projeção final. Empate persistente em 1º lugar leva a uma corrida sprint.`}</span></div>
              </>
            ) : (
              <div className="empty-state"><div className="target-icon"><Target size={24} /></div><b>Seu cenário começa aqui</b><span>Digite uma posição diferente para cada piloto, marque P1 e VMR se aplicável, e simule.</span></div>
            )}
            <TabelaClassificacao titulo="TABELA ATUAL" pilotos={classificacaoAtual} selecionado={selecionado} />
            <div className="rule-card"><FlagTriangleRight size={15} /><span>Descarte: <b>{regras.etapas_descontadas ?? 2} piores etapas, exceto Etapas 1 e 8 e Etapa Patrocínio</b></span></div>
          </aside>
        </section>

        {resultado && <div className="projection-full-wrap"><TabelaClassificacao titulo="CLASSIFICAÇÃO PROJETADA" pilotos={resultado.classificacao} selecionado={selecionado} completa projetada /></div>}

        {erro && <div className="toast"><AlertTriangle size={16} />{erro}</div>}
        <footer><span>GT NACIONAL <i>×</i> SIMULADOR DE ESTRATÉGIA</span><span>Diferenças em pontos para alcançar o piloto indicado.</span></footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
