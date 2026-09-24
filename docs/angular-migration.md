# Plano de atualização do Angular

Preparado em 24/09/2026. Esta alteração mantém Angular 14; a migração será executada em etapas separadas.

## Ponto de partida

- Angular/CLI/Material 14, TypeScript 4.7 e RxJS 7.5.
- Node 16.20.2 para reproduzir o ambiente atual; não é o destino da migração.
- Existem usos de Angular Flex Layout e personalizações dos componentes Material.
- `node scripts/regression-check.cjs` verifica os fluxos corrigidos sem depender de Chrome.
- `node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p tsconfig.app.json` verifica TypeScript e templates.

## Sequência

1. Guardar uma referência estável da versão atual. Registar capturas das páginas de login, perfil, clientes, vendas, pedidos e stock em desktop e telemóvel. Validar criação de venda numa base de testes.
2. Inventariar `fxLayout`, `fxFlex` e `FlexLayoutModule`. Substituir por CSS flex/grid e BreakpointObserver. O repositório Angular Flex Layout está arquivado.
3. Atualizar um major de cada vez: 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22. Em cada etapa, seguir o guia oficial, executar `ng update @angular/core@<major> @angular/cli@<major>` e depois atualizar Material/CDK para o mesmo major. Não usar `--force` para ignorar incompatibilidades.
4. Ajustar Node em cada transição conforme a matriz oficial. Uma sequência compatível a validar é Node 16 para 14–16; Node 18.19.1 para 16–19; Node 22.22.3 para 19–22. As versões antigas são apenas ambientes temporários de migração.
5. Rever a migração MDC do Material antes de avançar para versões que removem os componentes legados. Inspecionar formulários, tabelas, diálogos, chips e estilos `::ng-deep`.
6. Confirmar peer dependencies de ngx-charts, Font Awesome, jwt-decode e browser-image-compression em cada etapa; atualizar TypeScript e zone.js conforme o major, sem instalar versões arbitrárias.
7. Executar a compilação de produção, testes e revisão visual após cada major. Validar login/refresh, permissões dos três perfis, pesquisa remota, reenvio da mesma venda, alteração de senha e estados de erro.
8. Publicar primeiro num ambiente de testes e executar os mesmos cenários com a API. Guardar o artefacto anterior e um procedimento de reversão antes de publicar em produção.

## Critérios para terminar

Compilação de produção sem erros, dependências compatíveis, testes de sessão/vendas aprovados, navegação por teclado e layout móvel revistos e nenhum reenvio da mesma operação a debitar stock novamente.

Fontes oficiais consultadas:
- https://angular.dev/update-guide
- https://angular.dev/reference/versions
- https://github.com/angular/flex-layout
