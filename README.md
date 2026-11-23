# desafio_teste_campo_minado

Casos de teste em JavaScript (Jest) para **Campo minado de tabuleiro 18 x 14 com 40 bombas**.

## Especificação do desafio

> Campo minado (by Laura)
> - casos de teste para testar campo minado de tabuleiro 18 x 14 com 40 bombas;
> - casos de teste em Javascript para testar Javascript.

## Colaboradores

| Nome | RA |
|---|---|
| Gabriel Arantes | 24169751-2 |
| Filipe Ruiz Boligon | 24042069-2 |

## Como executar

Requer Node.js 18 ou superior.

```bash
npm install
npm test
```

## Para fazer TDD

Os testes em [`campo_minado.test.js`](campo_minado.test.js) são a especificação. O arquivo [`campo_minado.js`](campo_minado.js) é só uma implementação de referência: pode ser apagado e reescrito a partir dos testes. Ele deve exportar `{ CampoMinado, criarAleatorio, LINHAS, COLUNAS, BOMBAS }`.

## Regras do jogo (todas cobertas pelos testes)

1. **Tabuleiro**: 14 linhas por 18 colunas (252 células) com exatamente 40 bombas, 212 células seguras. Coordenadas `(linha, coluna)` a partir de 0.
2. **Vizinhança**: 8 direções. Canto tem 3 vizinhas, borda 5, meio 8. O número da célula é a quantidade de bombas vizinhas.
3. **Primeiro clique seguro**: as bombas só são sorteadas no primeiro clique, e a célula clicada com suas vizinhas nunca recebem bomba. O primeiro clique sempre abre uma área. Clique recusado (bandeira) não sorteia nada.
4. **Abrir**: célula numérica abre só ela; célula vazia (0) abre as vizinhas em cascata até os números. Abrir célula já aberta devolve 0. A cascata não abre célula com bandeira.
5. **Bandeiras**: só em célula fechada, e célula com bandeira não abre. O contador é 40 menos as bandeiras (bandeira errada também conta e não há limite, então pode ficar negativo). Pode-se marcar antes do primeiro clique.
6. **Atalho**: em célula numérica aberta com o mesmo número de bandeiras ao redor, abre as vizinhas sem bandeira (com cascata) e devolve quantas abriu. Se uma bandeira estiver errada, a bomba esquecida explode e nenhuma outra vizinha é aberta (o resultado não depende da ordem em que as vizinhas são percorridas). Recusado quando o número de bandeiras não bate, ou em célula fechada ou vazia.
7. **Derrota**: abrir uma bomba encerra o jogo, guarda onde explodiu e revela todas as bombas. Nenhuma jogada é aceita depois.
8. **Vitória**: abrir as 212 células seguras. As bombas ganham bandeira e o contador zera. Bandeira em célula segura impede a vitória até ser retirada. Nenhuma jogada é aceita depois.
9. **Mapa em texto**: `#` fechada, `F` bandeira, `*` bomba aberta, `.` vazia, `1` a `8` número.

## Funcionamento dos casos de teste

Cenários com bombas fixas permitem prever o resultado exato de cada jogada. Os sorteados usam semente (`criarAleatorio`), então são reproduzíveis.

- **Três faixas** (`tresFaixas`): bombas na coluna 6 inteira e nas colunas 12 e 14 (linhas 0 a 12). Isola quatro regiões: 3 cascatas (84, 70 e 42 células) e 16 cliques avulsos somam as 212 células seguras.
- **Faixa inferior** (`faixaInferior`): bombas nas linhas 12 e 13 e na linha 11 (colunas 0 a 3). Um único clique em `(0, 0)` abre as 212 e vence.

| Grupo | O que verifica |
|---|---|
| Regra 1 | Dimensões, estado inicial, bombas só depois do 1º clique, cenário com bomba a mais, a menos, repetida ou fora do tabuleiro |
| Regra 2 | Vizinhas de canto, borda e meio, números em cenário fixo e sorteado |
| Regra 3 | Primeiro clique seguro em canto, borda e meio, 300 sementes, mesma semente gera o mesmo tabuleiro |
| Regra 4 | Número, cascata, parede de bombas, reabrir, posições inválidas |
| Regra 5 | Marcar e desmarcar, contador, bandeira errada, 41 bandeiras, cascata e vitória com bandeira |
| Regra 6 | Atalho correto, com bandeira errada, recusas, vitória pelo atalho |
| Regra 7 | Explosão, bombas reveladas, jogo bloqueado |
| Regra 8 | Vitória em um clique, em 19 cliques, bandeiras automáticas, jogo bloqueado |
| Regra 9 | Mapa em texto |
| Partidas simuladas | Partida sorteada jogada até a vitória e até a derrota |
