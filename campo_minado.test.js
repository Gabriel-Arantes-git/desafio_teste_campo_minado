const { CampoMinado, criarAleatorio, LINHAS, COLUNAS, BOMBAS } = require('./campo_minado');

function tresFaixas() {
  const bombas = [];
  for (let l = 0; l < LINHAS; l++) bombas.push([l, 6]);
  for (let l = 0; l <= 12; l++) bombas.push([l, 12], [l, 14]);
  return bombas;
}

function faixaInferior() {
  const bombas = [];
  for (let c = 0; c < COLUNAS; c++) bombas.push([12, c], [13, c]);
  for (let c = 0; c <= 3; c++) bombas.push([11, c]);
  return bombas;
}

const contarBombas = (jogo) => jogo.tabuleiro.flat().filter((cel) => cel.bomba).length;

function cliquesDeVitoriaTresFaixas() {
  const cliques = [[0, 0], [0, 9], [0, 16], [13, 12], [13, 14]];
  for (let l = 0; l < LINHAS; l++) cliques.push([l, 13]);
  return cliques;
}

describe('Regra 1 - tabuleiro 18 x 14 com 40 bombas', () => {
  test('as constantes do jogo são 14 linhas, 18 colunas e 40 bombas', () => {
    expect([LINHAS, COLUNAS, BOMBAS]).toEqual([14, 18, 40]);
  });

  test('o tabuleiro tem 14 linhas de 18 células, 252 no total', () => {
    const jogo = new CampoMinado();
    expect(jogo.tabuleiro).toHaveLength(14);
    jogo.tabuleiro.forEach((linha) => expect(linha).toHaveLength(18));
    expect(jogo.tabuleiro.flat()).toHaveLength(252);
  });

  test('o jogo começa em andamento, tudo fechado, sem bandeiras e com 212 células seguras', () => {
    const jogo = new CampoMinado();
    expect(jogo.estado).toBe('jogando');
    expect(jogo.tabuleiro.flat().every((cel) => !cel.aberta && !cel.bandeira)).toBe(true);
    expect(jogo.celulasAbertas).toBe(0);
    expect(jogo.bombasRestantes).toBe(40);
    expect(jogo.celulasSeguras).toBe(212);
  });

  test('antes do primeiro clique ainda não existe nenhuma bomba no tabuleiro', () => {
    expect(contarBombas(new CampoMinado({ aleatorio: criarAleatorio(7) }))).toBe(0);
  });

  test.each([1, 2, 3, 42, 2026])('depois do primeiro clique existem exatamente 40 bombas (semente %i)', (semente) => {
    const jogo = new CampoMinado({ aleatorio: criarAleatorio(semente) });
    jogo.abrir(7, 9);
    expect(contarBombas(jogo)).toBe(40);
  });

  test('cenário fixo com menos ou mais de 40 bombas é recusado', () => {
    expect(() => new CampoMinado({ bombas: [[0, 0]] })).toThrow('exatamente 40 bombas');
    expect(() => new CampoMinado({ bombas: [...tresFaixas(), [13, 17]] })).toThrow('exatamente 40 bombas');
  });

  test('cenário fixo com bomba repetida é recusado', () => {
    const bombas = tresFaixas();
    bombas[39] = [0, 6];
    expect(() => new CampoMinado({ bombas })).toThrow('Bomba repetida');
  });

  test('cenário fixo com bomba fora do tabuleiro é recusado', () => {
    const bombas = tresFaixas();
    bombas[39] = [14, 0];
    expect(() => new CampoMinado({ bombas })).toThrow('fora do tabuleiro');
    bombas[39] = [0, 18];
    expect(() => new CampoMinado({ bombas })).toThrow('fora do tabuleiro');
  });
});

describe('Regra 2 - vizinhança de 8 direções', () => {
  const jogo = new CampoMinado();

  test.each([
    [0, 0, 3],
    [0, 17, 3],
    [13, 0, 3],
    [13, 17, 3],
  ])('o canto (%i, %i) tem %i vizinhas', (l, c, esperado) => {
    expect(jogo.vizinhos(l, c)).toHaveLength(esperado);
  });

  test.each([
    [0, 9],
    [13, 9],
    [6, 0],
    [6, 17],
  ])('a borda (%i, %i) tem 5 vizinhas', (l, c) => {
    expect(jogo.vizinhos(l, c)).toHaveLength(5);
  });

  test('uma célula do meio tem 8 vizinhas, todas a distância 1', () => {
    const vizinhos = jogo.vizinhos(6, 9);
    expect(vizinhos).toHaveLength(8);
    vizinhos.forEach(([l, c]) => expect(Math.max(Math.abs(l - 6), Math.abs(c - 9))).toBe(1));
    expect(vizinhos).not.toContainEqual([6, 9]);
  });

  test('o número de cada célula é a quantidade de bombas nas vizinhas (cenário fixo)', () => {
    const j = new CampoMinado({ bombas: tresFaixas() });
    expect(j.celula(0, 5).vizinhas).toBe(2);
    expect(j.celula(6, 5).vizinhas).toBe(3);
    expect(j.celula(13, 5).vizinhas).toBe(2);
    expect(j.celula(6, 3).vizinhas).toBe(0);
    expect(j.celula(6, 13).vizinhas).toBe(6);
    expect(j.celula(13, 12).vizinhas).toBe(1);
    expect(j.celula(13, 13).vizinhas).toBe(2);
    expect(j.celula(12, 15).vizinhas).toBe(2);
    expect(j.celula(6, 16).vizinhas).toBe(0);
  });

  test('em um tabuleiro sorteado, todos os números conferem com as bombas vizinhas', () => {
    const j = new CampoMinado({ aleatorio: criarAleatorio(321) });
    j.abrir(5, 5);
    for (let l = 0; l < LINHAS; l++) {
      for (let c = 0; c < COLUNAS; c++) {
        const esperado = j.vizinhos(l, c).filter(([vl, vc]) => j.tabuleiro[vl][vc].bomba).length;
        expect(j.celula(l, c).vizinhas).toBe(esperado);
      }
    }
  });
});

describe('Regra 3 - o primeiro clique nunca perde', () => {
  test.each([
    [0, 0],
    [0, 17],
    [13, 0],
    [13, 17],
    [7, 9],
  ])('clique em (%i, %i): não é bomba, não tem bomba vizinha e abre mais de uma célula', (l, c) => {
    const jogo = new CampoMinado({ aleatorio: criarAleatorio(42) });
    const abertas = jogo.abrir(l, c);
    expect(jogo.estado).toBe('jogando');
    expect(jogo.celula(l, c).bomba).toBe(false);
    expect(jogo.celula(l, c).vizinhas).toBe(0);
    expect(abertas).toBeGreaterThan(1);
  });

  test('vale para 300 sementes diferentes, com clique em canto, borda ou meio', () => {
    const cliques = [[0, 0], [13, 17], [0, 9], [7, 0], [7, 9]];
    for (let semente = 1; semente <= 300; semente++) {
      const [l, c] = cliques[semente % cliques.length];
      const jogo = new CampoMinado({ aleatorio: criarAleatorio(semente) });
      jogo.abrir(l, c);
      expect(jogo.estado).not.toBe('derrota');
      expect(jogo.celula(l, c).bomba).toBe(false);
      expect(jogo.vizinhos(l, c).some(([vl, vc]) => jogo.celula(vl, vc).bomba)).toBe(false);
      expect(contarBombas(jogo)).toBe(40);
    }
  });

  test('a mesma semente gera o mesmo tabuleiro; sementes diferentes geram tabuleiros diferentes', () => {
    const bombasDe = (semente) => {
      const jogo = new CampoMinado({ aleatorio: criarAleatorio(semente) });
      jogo.abrir(3, 3);
      return jogo.tabuleiro.flat().map((cel) => cel.bomba);
    };
    expect(bombasDe(55)).toEqual(bombasDe(55));
    expect(bombasDe(55)).not.toEqual(bombasDe(56));
  });

  test('clique recusado por causa da bandeira não sorteia as bombas', () => {
    const jogo = new CampoMinado({ aleatorio: criarAleatorio(5) });
    jogo.alternarBandeira(0, 0);
    expect(() => jogo.abrir(0, 0)).toThrow('bandeira');
    expect(contarBombas(jogo)).toBe(0);
  });

  test('com bombas fixas, o primeiro clique não muda a posição das bombas', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(6, 3);
    expect(jogo.celula(6, 6).bomba).toBe(true);
    expect(contarBombas(jogo)).toBe(40);
  });
});

describe('Regra 4 - abrir células', () => {
  test('célula com número abre só ela mesma e devolve 1', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    expect(jogo.abrir(0, 5)).toBe(1);
    expect(jogo.celulasAbertas).toBe(1);
    expect(jogo.celula(0, 5).aberta).toBe(true);
    expect(jogo.celula(1, 5).aberta).toBe(false);
  });

  test('célula vazia abre em cascata e para nos números (colunas 0 a 5)', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    expect(jogo.abrir(0, 0)).toBe(84);
    for (let l = 0; l < LINHAS; l++) {
      for (let c = 0; c < COLUNAS; c++) expect(jogo.celula(l, c).aberta).toBe(c <= 5);
    }
    expect(jogo.estado).toBe('jogando');
  });

  test('a cascata não atravessa uma faixa de bombas: a região vizinha continua fechada', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 0);
    expect(jogo.celula(0, 7).aberta).toBe(false);
    expect(jogo.abrir(0, 9)).toBe(70);
    expect(jogo.celula(0, 13).aberta).toBe(false);
  });

  test('a cascata abre também os números da borda e nunca uma bomba', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 0);
    expect(jogo.celula(0, 5).aberta).toBe(true);
    expect(jogo.celula(0, 6).aberta).toBe(false);
  });

  test('abrir de novo uma célula já aberta não muda nada e devolve 0', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 5);
    expect(jogo.abrir(0, 5)).toBe(0);
    expect(jogo.celulasAbertas).toBe(1);
  });

  test.each([
    [-1, 0],
    [14, 0],
    [0, -1],
    [0, 18],
    [1.5, 2],
    ['1', 2],
  ])('posição (%p, %p) fora do tabuleiro é recusada', (l, c) => {
    const jogo = new CampoMinado();
    expect(() => jogo.abrir(l, c)).toThrow('fora do tabuleiro');
  });

  test('bandeira, atalho e consulta de célula também recusam posição fora do tabuleiro', () => {
    const jogo = new CampoMinado();
    expect(() => jogo.alternarBandeira(14, 0)).toThrow('fora do tabuleiro');
    expect(() => jogo.abrirVizinhas(0, 18)).toThrow('fora do tabuleiro');
    expect(() => jogo.celula(-1, 0)).toThrow('fora do tabuleiro');
    expect(jogo.bandeiras).toBe(0);
  });

  test('o contador de células abertas bate com as células abertas no tabuleiro', () => {
    const jogo = new CampoMinado({ aleatorio: criarAleatorio(11) });
    jogo.abrir(7, 9);
    expect(jogo.celulasAbertas).toBe(jogo.tabuleiro.flat().filter((cel) => cel.aberta).length);
  });
});

describe('Regra 5 - bandeiras', () => {
  test('marcar e desmarcar atualiza o contador de bombas restantes', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    expect(jogo.alternarBandeira(0, 6)).toBe(true);
    expect(jogo.bombasRestantes).toBe(39);
    expect(jogo.alternarBandeira(0, 6)).toBe(false);
    expect(jogo.bombasRestantes).toBe(40);
  });

  test('pode marcar bandeira antes do primeiro clique', () => {
    const jogo = new CampoMinado({ aleatorio: criarAleatorio(3) });
    jogo.alternarBandeira(13, 17);
    expect(jogo.bombasRestantes).toBe(39);
  });

  test('célula com bandeira não pode ser aberta e o jogo continua', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.alternarBandeira(0, 6);
    expect(() => jogo.abrir(0, 6)).toThrow('bandeira');
    expect(jogo.estado).toBe('jogando');
  });

  test('célula aberta não pode receber bandeira', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 5);
    expect(() => jogo.alternarBandeira(0, 5)).toThrow('aberta');
  });

  test('o contador conta bandeiras, não acertos: bandeira em célula segura também desconta', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.alternarBandeira(0, 0);
    expect(jogo.bombasRestantes).toBe(39);
    expect(contarBombas(jogo)).toBe(40);
  });

  test('não há limite de bandeiras: com 41 o contador fica em -1', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    let colocadas = 0;
    for (let l = 0; l < LINHAS && colocadas < 41; l++) {
      for (let c = 7; c <= 11 && colocadas < 41; c++) {
        jogo.alternarBandeira(l, c);
        colocadas++;
        if (colocadas === 40) expect(jogo.bombasRestantes).toBe(0);
      }
    }
    expect(jogo.bandeiras).toBe(41);
    expect(jogo.bombasRestantes).toBe(-1);
  });

  test('a cascata passa por cima de células com bandeira sem abri-las', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.alternarBandeira(10, 2);
    expect(jogo.abrir(0, 0)).toBe(83);
    expect(jogo.celula(10, 2).aberta).toBe(false);
    expect(jogo.celula(10, 2).bandeira).toBe(true);
  });

  test('bandeira não conta como célula aberta para a vitória', () => {
    const jogo = new CampoMinado({ bombas: faixaInferior() });
    jogo.alternarBandeira(0, 0);
    jogo.abrir(5, 5);
    expect(jogo.estado).toBe('jogando');
    expect(jogo.celulasAbertas).toBe(211);
  });
});

describe('Regra 6 - atalho para abrir as vizinhas de um número', () => {
  test('com as bandeiras certas ao redor, abre as vizinhas sem bandeira', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(6, 7);
    jogo.alternarBandeira(5, 6);
    jogo.alternarBandeira(6, 6);
    jogo.alternarBandeira(7, 6);
    expect(jogo.abrirVizinhas(6, 7)).toBe(69);
    expect(jogo.celula(6, 8).aberta).toBe(true);
    expect(jogo.celulasAbertas).toBe(70);
    expect(jogo.estado).toBe('jogando');
  });

  test('o atalho em célula sem vizinha fechada não abre nada e devolve 0', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 9);
    jogo.alternarBandeira(0, 6);
    jogo.alternarBandeira(1, 6);
    expect(jogo.abrirVizinhas(0, 7)).toBe(0);
    expect(jogo.celulasAbertas).toBe(70);
  });

  test('com uma bandeira no lugar errado, a bomba esquecida explode', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(6, 5);
    jogo.alternarBandeira(5, 6);
    jogo.alternarBandeira(6, 6);
    jogo.alternarBandeira(5, 4);
    expect(jogo.abrirVizinhas(6, 5)).toBe(0);
    expect(jogo.estado).toBe('derrota');
    expect(jogo.explosao).toEqual({ linha: 7, coluna: 6 });
  });

  test('com bandeira errada, nenhuma outra vizinha é aberta: só a bomba explode', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(6, 7);
    jogo.alternarBandeira(6, 6);
    jogo.alternarBandeira(7, 6);
    jogo.alternarBandeira(5, 8);
    jogo.abrirVizinhas(6, 7);
    expect(jogo.estado).toBe('derrota');
    expect(jogo.explosao).toEqual({ linha: 5, coluna: 6 });
    expect(jogo.celulasAbertas).toBe(1);
    expect(jogo.celula(6, 8).aberta).toBe(false);
    expect(jogo.celula(7, 7).aberta).toBe(false);
  });

  test('a bandeira errada continua na célula segura depois da explosão', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(6, 7);
    jogo.alternarBandeira(6, 6);
    jogo.alternarBandeira(7, 6);
    jogo.alternarBandeira(5, 8);
    jogo.abrirVizinhas(6, 7);
    expect(jogo.celula(5, 8).bandeira).toBe(true);
    expect(jogo.celula(5, 8).aberta).toBe(false);
  });

  test('é recusado quando a quantidade de bandeiras não bate com o número', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(6, 5);
    jogo.alternarBandeira(5, 6);
    expect(() => jogo.abrirVizinhas(6, 5)).toThrow('não conferem');
    expect(jogo.estado).toBe('jogando');
  });

  test('é recusado em célula fechada e em célula vazia (0)', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    expect(() => jogo.abrirVizinhas(6, 5)).toThrow('numérica aberta');
    jogo.abrir(0, 0);
    expect(() => jogo.abrirVizinhas(0, 0)).toThrow('numérica aberta');
  });

  test('o atalho que abre a última célula segura vence o jogo', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    const cliques = cliquesDeVitoriaTresFaixas();

    cliques.filter(([l, c]) => !(l === 13 && c === 14)).forEach(([l, c]) => jogo.abrir(l, c));
    expect(jogo.estado).toBe('jogando');
    expect(jogo.celulasAbertas).toBe(211);
    jogo.alternarBandeira(12, 14);
    expect(jogo.celula(13, 15).vizinhas).toBe(1);
    expect(jogo.abrirVizinhas(13, 15)).toBe(1);
    expect(jogo.estado).toBe('vitoria');
  });

  test('depois do fim do jogo o atalho não é aceito', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 5);
    jogo.abrir(0, 6);
    expect(() => jogo.abrirVizinhas(0, 5)).toThrow('já terminou');
  });
});

describe('Regra 7 - derrota', () => {
  test('abrir uma bomba encerra o jogo, guarda onde foi e revela todas as bombas', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 0);
    expect(jogo.abrir(3, 6)).toBe(0);
    expect(jogo.estado).toBe('derrota');
    expect(jogo.explosao).toEqual({ linha: 3, coluna: 6 });
    const bombas = jogo.tabuleiro.flat().filter((cel) => cel.bomba);
    expect(bombas).toHaveLength(40);
    expect(bombas.every((cel) => cel.aberta)).toBe(true);
  });

  test('perder no primeiro clique é impossível, mesmo com bandeiras espalhadas', () => {
    for (let semente = 1; semente <= 50; semente++) {
      const jogo = new CampoMinado({ aleatorio: criarAleatorio(semente) });
      jogo.alternarBandeira(0, 0);
      jogo.abrir(7, 9);
      expect(jogo.estado).not.toBe('derrota');
    }
  });

  test('depois da derrota nenhuma jogada é aceita', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 6);
    expect(() => jogo.abrir(0, 0)).toThrow('já terminou');
    expect(() => jogo.alternarBandeira(0, 0)).toThrow('já terminou');
  });

  test('a derrota não conta as bombas reveladas como células abertas', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 0);
    jogo.abrir(3, 6);
    expect(jogo.celulasAbertas).toBe(84);
  });

  test('no mapa em texto as bombas reveladas aparecem como *', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 0);
    jogo.abrir(3, 6);
    const linhas = jogo.visualizar().split('\n');
    expect(linhas[0]).toBe('.....2*#####*#*###');
    expect(linhas[3]).toBe('.....3*#####*#*###');
    expect(linhas[13]).toBe('.....2*###########');
  });
});

describe('Regra 8 - vitória', () => {
  test('um único clique pode vencer, abrindo as 212 células seguras', () => {
    const jogo = new CampoMinado({ bombas: faixaInferior() });
    expect(jogo.abrir(0, 0)).toBe(212);
    expect(jogo.estado).toBe('vitoria');
    expect(jogo.celulasAbertas).toBe(212);
  });

  test('3 cascatas e 16 cliques avulsos vencem o cenário das três faixas', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    const cliques = cliquesDeVitoriaTresFaixas();
    expect(cliques).toHaveLength(5 + 14);
    cliques.slice(0, -1).forEach(([l, c]) => {
      jogo.abrir(l, c);
      expect(jogo.estado).toBe('jogando');
    });
    expect(jogo.celulasAbertas).toBe(211);
    const [l, c] = cliques[cliques.length - 1];
    expect(jogo.abrir(l, c)).toBe(1);
    expect(jogo.estado).toBe('vitoria');
    expect(jogo.celulasAbertas).toBe(212);
  });

  test('faltando uma célula segura, ainda não é vitória', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    cliquesDeVitoriaTresFaixas().slice(0, -1).forEach(([l, c]) => jogo.abrir(l, c));
    expect(jogo.estado).toBe('jogando');
  });

  test('na vitória todas as bombas ganham bandeira e o contador zera', () => {
    const jogo = new CampoMinado({ bombas: faixaInferior() });
    jogo.alternarBandeira(5, 5);
    jogo.abrir(0, 0);
    expect(jogo.estado).toBe('jogando');
    jogo.alternarBandeira(5, 5);
    jogo.abrir(5, 5);
    expect(jogo.estado).toBe('vitoria');
    expect(jogo.tabuleiro.flat().filter((cel) => cel.bomba).every((cel) => cel.bandeira)).toBe(true);
    expect(jogo.tabuleiro.flat().filter((cel) => !cel.bomba).every((cel) => !cel.bandeira)).toBe(true);
    expect(jogo.bombasRestantes).toBe(0);
  });

  test('depois da vitória nenhuma jogada é aceita', () => {
    const jogo = new CampoMinado({ bombas: faixaInferior() });
    jogo.abrir(0, 0);
    expect(() => jogo.abrir(12, 0)).toThrow('já terminou');
    expect(() => jogo.alternarBandeira(12, 0)).toThrow('já terminou');
  });
});

describe('Regra 9 - mapa em texto', () => {
  test('tabuleiro novo: 14 linhas de 18 símbolos #', () => {
    const linhas = new CampoMinado().visualizar().split('\n');
    expect(linhas).toHaveLength(14);
    linhas.forEach((linha) => expect(linha).toBe('#'.repeat(18)));
  });

  test('mostra vazias (.), números, bandeiras (F) e células fechadas (#)', () => {
    const jogo = new CampoMinado({ bombas: tresFaixas() });
    jogo.abrir(0, 0);
    jogo.alternarBandeira(0, 6);
    const linhas = jogo.visualizar().split('\n');
    expect(linhas[0]).toBe('.....2F###########');
    expect(linhas[6]).toBe('.....3############');
    expect(linhas[13]).toBe('.....2############');
  });
});

describe('Partidas simuladas', () => {
  test.each([1, 2, 3, 2026])('jogador que sabe onde estão as bombas vence a partida sorteada (semente %i)', (semente) => {
    const jogo = new CampoMinado({ aleatorio: criarAleatorio(semente) });
    jogo.abrir(7, 9);
    for (let l = 0; l < LINHAS; l++) {
      for (let c = 0; c < COLUNAS; c++) if (jogo.celula(l, c).bomba) jogo.alternarBandeira(l, c);
    }
    expect(jogo.bombasRestantes).toBe(0);
    for (let l = 0; l < LINHAS; l++) {
      for (let c = 0; c < COLUNAS; c++) {
        const cel = jogo.celula(l, c);
        if (jogo.estado === 'jogando' && !cel.bomba && !cel.aberta) jogo.abrir(l, c);
      }
    }
    expect(jogo.estado).toBe('vitoria');
    expect(jogo.celulasAbertas).toBe(212);
  });

  test('jogador que abre as células na ordem do tabuleiro, sem saber onde estão as bombas, perde (semente 2026)', () => {
    const jogo = new CampoMinado({ aleatorio: criarAleatorio(2026) });
    jogo.abrir(7, 9);
    for (let l = 0; l < LINHAS && jogo.estado === 'jogando'; l++) {
      for (let c = 0; c < COLUNAS && jogo.estado === 'jogando'; c++) {
        if (!jogo.celula(l, c).aberta) jogo.abrir(l, c);
      }
    }
    expect(jogo.estado).toBe('derrota');
    expect(jogo.celula(jogo.explosao.linha, jogo.explosao.coluna).bomba).toBe(true);
    expect(jogo.tabuleiro.flat().filter((cel) => cel.bomba).every((cel) => cel.aberta)).toBe(true);
  });
});
