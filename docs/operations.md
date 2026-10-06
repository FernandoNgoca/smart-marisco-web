# Vendas, permissões e validação

## Publicação conjunta com a API

A API inclui a migração Flyway `V8__Sale_Operation.sql`. O frontend envia `Idempotency-Key` no POST de vendas e pedidos; este cabeçalho é agora obrigatório. Atualizar API e frontend de forma coordenada. Clientes antigos que não enviem o cabeçalho recebem HTTP 400.

Cada finalização gera uma chave aleatória. Enquanto o envio está em curso, adicionar/editar/remover/finalizar fica bloqueado. Após erro, reenviar os mesmos dados reutiliza a chave; após sucesso, a próxima venda recebe outra chave. Alterar os dados também inicia uma operação diferente. As chaves em curso pertencem ao formulário e não são recuperadas após recarregar a página: em caso de resultado incerto seguido de navegação, consultar o histórico antes de recriar a venda.

A API guarda a resposta e o hash do pedido numa transação com a venda e movimentos de stock. Reenvios com a mesma chave e utilizador devolvem a resposta original; usar a mesma chave com dados diferentes devolve 409. Operações do mesmo utilizador são serializadas através de um bloqueio na base de dados. Isto não identifica duas vendas intencionais com chaves diferentes como duplicadas.

## Perfis

| Ação | Utilizador | Gerente | Administrador |
|---|---|---|---|
| Consultar/criar clientes e registar vendas/pedidos | Sim | Sim | Sim |
| Editar/desativar clientes | Não | Sim | Sim |
| Páginas de gestão de produtos, stock e configurações | Não | Sim | Sim |
| Indicadores de gestão no dashboard | Não | Sim | Sim |
| Gestão de utilizadores | Não | Não | Sim |
| Perfil e suporte | Sim | Sim | Sim |

A API mantém a autorização efetiva. As permissões de navegação e botões servem para apresentar apenas as ações disponíveis. A API permite consultas GET aos três perfis, incluindo os produtos necessários para vender.

## Verificação local

Frontend: `node scripts/regression-check.cjs` e compilação dos templates.
API: `bash mvnw test` (os testes usam H2 e o perfil test, não a base de produção).
Testar manualmente no navegador a combinação API + frontend, incluindo pesquisa por um cliente fora dos primeiros 100 resultados e resposta de erro no dashboard.
