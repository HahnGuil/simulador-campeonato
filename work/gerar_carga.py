import openpyxl, re
from pathlib import Path
arquivo=Path('/Users/hahnguil/Desktop/VISUALIZAÇÃO TABELA T7 - LIGA GT NACIONAL 2026.xlsx')
wb=openpyxl.load_workbook(arquivo,data_only=True)
def q(v): return 'NULL' if v is None else "'"+str(v).replace("'","''")+"'"
def b(v): return 'TRUE' if v else 'FALSE'
series={'A':1,'B':2,'C':3}
tracks={1:'Alsace - Vila',2:'Deep Forest',3:'Dragon Trail - Litoral',4:'Sardegna - Traçado B invertido',5:'Lago Maggiore - Pista completa',6:'Fuji Speedway - Pista completa com chicane',7:'Tokyo Expressway - Traçado Sul',8:'Mount Panorama - Bathurst'}
out=[]
out.append("INSERT INTO series(id,nome) VALUES (1,'A'),(2,'B'),(3,'C') ON CONFLICT(id) DO UPDATE SET nome=EXCLUDED.nome;")
for i,name in tracks.items(): out.append(f"INSERT INTO etapas(id,numero,nome) VALUES ({i},{i},{q(name)}) ON CONFLICT(numero) DO UPDATE SET nome=EXCLUDED.nome;")
out.append("INSERT INTO regras(chave,valor) VALUES ('pontos_por_posicao','[28,24,20,17,15,13,12,11,10,9,8,7,6,5]'::jsonb),('bonus_final','[12,8,5,3,3,1,1,1,0,0,0,0,0,0]'::jsonb),('etapas_descontadas','2'::jsonb),('etapas_protegidas','[1,8]'::jsonb) ON CONFLICT(chave) DO UPDATE SET valor=EXCLUDED.valor;")
pilots={};results=[];stage_counts={}
for code,sid in series.items():
 sh=wb[f'SÉRIE {code}']
 # tabela geral: inclui nomes e patrocínios sem recalcular os valores oficiais
 for row in range(5,19):
  nome=sh.cell(row,3).value
  if not nome: continue
  pilots[(code,nome)]={'id':len(pilots)+1,'sponsor':sh.cell(row,4).value,'etapa_sponsor':None}
 # blocos de classificação por etapa
 for row in range(1,sh.max_row+1):
  if sh.cell(row,2).value!='CLASSIFICAÇÃO' or sh.cell(row,3).value!='PILOTO' or sh.cell(row,15).value!='PONTOS': continue
  prev=' '.join(str(sh.cell(i,2).value or '') for i in range(max(1,row-2),row))
  match=re.search(r'ETAPA\s+(\d+)',prev)
  if not match: continue
  etapa=int(match.group(1))
  for rr in range(row+1,row+16):
   nome=sh.cell(rr,3).value;pos=sh.cell(rr,2).value
   if not nome or (not isinstance(pos,(int,float)) and str(pos)!='NT'): continue
   key=(code,nome)
   if key not in pilots: continue
   pts=float(sh.cell(rr,15).value or 0); penalty=float(sh.cell(rr,10).value or 0)
   pole=str(sh.cell(rr,8).value or '').upper()=='X';vmr=str(sh.cell(rr,9).value or '').upper()=='X'
   sponsor_done=str(sh.cell(rr,4).value or '').upper()=='X'
   if sponsor_done: pilots[key]['etapa_sponsor']=etapa
   results.append((pilots[key]['id'],etapa,99 if str(pos)=='NT' else int(pos),pts-penalty,pole,vmr,sponsor_done,penalty)); stage_counts[code]=max(stage_counts.get(code,0),etapa)
for (code,name),p in pilots.items():
 out.append(f"INSERT INTO pilotos(id,nome,serie_id,patrocinador,etapa_patrocinio) VALUES ({p['id']},{q(name)},{series[code]},{q(p['sponsor'])},{p['etapa_sponsor'] or 'NULL'}) ON CONFLICT(nome,serie_id) DO UPDATE SET patrocinador=EXCLUDED.patrocinador,etapa_patrocinio=EXCLUDED.etapa_patrocinio;")
# IDs stable by summary order, map through deterministic order above
for pilot_id,etapa,pos,pts,pole,vmr,pat,pen in results:
 out.append(f"INSERT INTO resultados(piloto_id,etapa_id,posicao,pontos,pole,vmr,etapa_patrocinio,penalidade) VALUES ({pilot_id},{etapa},{pos},{pts:g},{b(pole)},{b(vmr)},{b(pat)},{pen:g}) ON CONFLICT(piloto_id,etapa_id) DO UPDATE SET posicao=EXCLUDED.posicao,pontos=EXCLUDED.pontos,pole=EXCLUDED.pole,vmr=EXCLUDED.vmr,etapa_patrocinio=EXCLUDED.etapa_patrocinio,penalidade=EXCLUDED.penalidade;")
out.extend(["SELECT setval('series_id_seq', GREATEST((SELECT MAX(id) FROM series),1));","SELECT setval('etapas_id_seq', GREATEST((SELECT MAX(id) FROM etapas),1));","SELECT setval('pilotos_id_seq', GREATEST((SELECT MAX(id) FROM pilotos),1));","SELECT setval('resultados_id_seq', GREATEST((SELECT MAX(id) FROM resultados),1));"])
Path('server/src/infra/temporada.sql').write_text('\n'.join(out)+'\n')
print('pilotos',len(pilots),'resultados',len(results),'maior etapa por série',stage_counts,'SQL linhas',len(out))
# Confere pontuação total calculada contra quadro de resumo, depois das penalizações
for code in series:
 totals={name:0 for (s,name) in pilots if s==code}
 for pid,n,_,pts,*_ in results:
  key=next((k for k,v in pilots.items() if v['id']==pid),None)
  if key and key[0]==code: totals[key[1]]+=pts
 sh=wb[f'SÉRIE {code}']; official={sh.cell(r,3).value:float(sh.cell(r,15).value or 0) for r in range(5,19) if sh.cell(r,3).value}
 mismatches=[(n,official.get(n),totals[n]) for n in totals if official.get(n)!=totals[n]]
 print(code,'divergências resultado detalhado vs tabela geral:',mismatches)
