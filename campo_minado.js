const LINHAS = 14;
const COLUNAS = 18;
const BOMBAS = 40;

function criarAleatorio(semente) {
  let estado = semente >>> 0;
  return function proximo() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class CampoMinado {

  constructor({ aleatorio = Math.random, bombas = null } = {}) {
    this.linhas = LINHAS;
    this.colunas = COLUNAS;
    this.totalBombas = BOMBAS;
    this.estado = 'jogando';
    this.explosao = null;
    this.bandeiras = 0;
    this.celulasAbertas = 0;
    this._aleatorio = aleatorio;
    this._bombasPosicionadas = false;
    this.tabuleiro = Array.from({ length: LINHAS }, () =>
      Array.from({ length: COLUNAS }, () => ({ bomba: false, aberta: false, bandeira: false, vizinhas: 0 })),
    );
    if (bombas) this._posicionarBombas(bombas);
  }

  get bombasRestantes() {
    return this.totalBombas - this.bandeiras;
  }

  get celulasSeguras() {
    return this.linhas * this.colunas - this.totalBombas;
  }

  dentro(l, c) {
    return Number.isInteger(l) && Number.isInteger(c) && l >= 0 && l < this.linhas && c >= 0 && c < this.colunas;
  }

  vizinhos(l, c) {
    const lista = [];
    for (let dl = -1; dl <= 1; dl++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dl !== 0 || dc !== 0) && this.dentro(l + dl, c + dc)) lista.push([l + dl, c + dc]);
      }
    }
    return lista;
  }

  celula(l, c) {
    this._exigirDentro(l, c);
    return this.tabuleiro[l][c];
  }

  abrir(l, c) {
    this._exigirEmAndamento();
    this._exigirDentro(l, c);
    const cel = this.tabuleiro[l][c];
    if (cel.bandeira) throw new Error('Célula com bandeira não pode ser aberta');
    if (!this._bombasPosicionadas) this._sortearBombas(l, c);
    if (cel.aberta) return 0;
    if (cel.bomba) {
      this._explodir(l, c);
      return 0;
    }
    const abertas = this._abrirEmCascata(l, c);
    this._conferirVitoria();
    return abertas;
  }

  alternarBandeira(l, c) {
    this._exigirEmAndamento();
    this._exigirDentro(l, c);
    const cel = this.tabuleiro[l][c];
    if (cel.aberta) throw new Error('Célula aberta não pode receber bandeira');
    cel.bandeira = !cel.bandeira;
    this.bandeiras += cel.bandeira ? 1 : -1;
    return cel.bandeira;
  }

  abrirVizinhas(l, c) {
    this._exigirEmAndamento();
    this._exigirDentro(l, c);
    const cel = this.tabuleiro[l][c];
    if (!cel.aberta || cel.vizinhas === 0) throw new Error('O atalho só vale para célula numérica aberta');
    const vizinhos = this.vizinhos(l, c);
    const marcadas = vizinhos.filter(([vl, vc]) => this.tabuleiro[vl][vc].bandeira).length;
    if (marcadas !== cel.vizinhas) throw new Error('Bandeiras ao redor não conferem com o número da célula');

    const esquecida = vizinhos.find(([vl, vc]) => {
      const viz = this.tabuleiro[vl][vc];
      return viz.bomba && !viz.bandeira;
    });
    if (esquecida) {
      this._explodir(esquecida[0], esquecida[1]);
      return 0;
    }

    let abertas = 0;
    for (const [vl, vc] of vizinhos) abertas += this._abrirEmCascata(vl, vc);
    this._conferirVitoria();
    return abertas;
  }

  visualizar() {
    return this.tabuleiro
      .map((linha) =>
        linha
          .map((cel) => {
            if (cel.bandeira) return 'F';
            if (!cel.aberta) return '#';
            if (cel.bomba) return '*';
            return cel.vizinhas === 0 ? '.' : String(cel.vizinhas);
          })
          .join(''),
      )
      .join('\n');
  }

  _exigirDentro(l, c) {
    if (!this.dentro(l, c)) throw new Error(`Posição fora do tabuleiro: (${l}, ${c})`);
  }

  _exigirEmAndamento() {
    if (this.estado !== 'jogando') throw new Error('O jogo já terminou');
  }

  _posicionarBombas(posicoes) {
    if (posicoes.length !== this.totalBombas) {
      throw new Error(`O tabuleiro precisa de exatamente ${this.totalBombas} bombas`);
    }
    const vistas = new Set();
    for (const [l, c] of posicoes) {
      this._exigirDentro(l, c);
      if (vistas.has(`${l},${c}`)) throw new Error(`Bomba repetida em (${l}, ${c})`);
      vistas.add(`${l},${c}`);
      this.tabuleiro[l][c].bomba = true;
    }
    for (let l = 0; l < this.linhas; l++) {
      for (let c = 0; c < this.colunas; c++) {
        this.tabuleiro[l][c].vizinhas = this.vizinhos(l, c).filter(([vl, vc]) => this.tabuleiro[vl][vc].bomba).length;
      }
    }
    this._bombasPosicionadas = true;
  }

  _sortearBombas(lClique, cClique) {
    const poupadas = new Set([[lClique, cClique], ...this.vizinhos(lClique, cClique)].map(([l, c]) => `${l},${c}`));
    const candidatas = [];
    for (let l = 0; l < this.linhas; l++) {
      for (let c = 0; c < this.colunas; c++) if (!poupadas.has(`${l},${c}`)) candidatas.push([l, c]);
    }

    for (let i = 0; i < this.totalBombas; i++) {
      const j = i + Math.floor(this._aleatorio() * (candidatas.length - i));
      [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
    }
    this._posicionarBombas(candidatas.slice(0, this.totalBombas));
  }

  _abrirEmCascata(l, c) {
    const pilha = [[l, c]];
    let abertas = 0;
    while (pilha.length > 0) {
      const [al, ac] = pilha.pop();
      const cel = this.tabuleiro[al][ac];
      if (cel.aberta || cel.bandeira || cel.bomba) continue;
      cel.aberta = true;
      abertas++;
      this.celulasAbertas++;
      if (cel.vizinhas === 0) pilha.push(...this.vizinhos(al, ac));
    }
    return abertas;
  }

  _explodir(l, c) {
    this.estado = 'derrota';
    this.explosao = { linha: l, coluna: c };
    for (const linha of this.tabuleiro) {
      for (const cel of linha) if (cel.bomba) cel.aberta = true;
    }
  }

  _conferirVitoria() {
    if (this.celulasAbertas !== this.celulasSeguras) return;
    this.estado = 'vitoria';
    this.bandeiras = 0;
    for (const linha of this.tabuleiro) {
      for (const cel of linha) {
        cel.bandeira = cel.bomba;
        if (cel.bandeira) this.bandeiras++;
      }
    }
  }
}

module.exports = { CampoMinado, criarAleatorio, LINHAS, COLUNAS, BOMBAS };
