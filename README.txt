Aplicação desenvolvida por Rodrigo Zimmermann, ano 2025.

Este aplicativo tem o objetivo de gerar um PDF com fotos da galeria do usuário.
O objetivo da aplicação é atender a uma demanda pessoal de trabalho.

Atualizações em 12/01/2026:
- Novo algoritmo para calcular a previsão do tamanho final do arquivo PDF;
- Incremento no service-worker para garantir que o aplicativo possa funcionar offline, desde que cacheado.

Atualizações em 30/03/2026:
- Imposto o limite de 25 imagens. Caso o usuário carregue mais de 25 imagens, somente as primeiras 25 imagens serão carregadas e isso é informado ao usuário. Esse comportamento foi necessário pois o aplicativo faz a manipulação na memória para calcular o tamanho final do arquivo PDF, carregar muitas imagens grandes ao mesmo tempo pode tornar o aplicativo instável. Diante deste problema, foi optado por impor o limite informado, pois mesmo diante do limite o aplicativo será capaz de atingir o objetivo, porém com a garantia de maior estabilidade.
- Criada uma função que altera o texto do botão "Gerar PDF" para "Aguarde..." enquanto o aplicativo estiver realizando o processamento. Trata-se de uma melhoria na interface do usuário, pois anteriormente não havia nenhuma informação para o usuário lhe informando que deve aguardar o processamento terminar.

LISTA DE AFAZERES:
- Reimplementar o aplicativo utilizando classes do JavaScript;
- Utilizar blocos try e catch para tratamento de erros;
- Modularizar o aplicativo.
