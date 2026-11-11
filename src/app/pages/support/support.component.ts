import { Component } from '@angular/core';
import { AuthService } from '@app/services/auth.service';
import { SUPPORT_CONTACT } from '@app/config/support.config';

interface HelpTopic {
  title: string;
  icon: string;
  route: string;
  linkLabel: string;
  steps: string[];
  audience: 'business' | 'manager' | 'admin' | 'all';
}
interface Question {
  title: string;
  answer: string;
  audience: 'business' | 'manager' | 'admin' | 'all';
}

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent {
  query = '';
  readonly contact = SUPPORT_CONTACT;
  readonly topics: HelpTopic[] = [
    {title:'Registar uma venda', icon:'fa-cart-shopping', route:'/sales/sale', linkLabel:'Abrir Nova venda', audience:'business',
      steps:['Em Vendas › Nova venda, clique no produto, escreva a quantidade e carregue em Enter.', 'Repita para outros produtos; o mesmo produto soma à linha existente. Pode corrigir a quantidade diretamente no carrinho.', 'Escolha o cliente se quiser (sem cliente fica “Consumidor final”) e clique em Finalizar venda. O recibo abre a seguir.']},
    {title:'Concluir um pedido', icon:'fa-clipboard-list', route:'/sales/orderHistory', linkLabel:'Abrir Pedidos', audience:'business',
      steps:['Em Vendas › Pedidos, filtre por “Pendentes” e localize o pedido pelo cliente ou pelo número.', 'Use o olho para ver os produtos e o lápis para os corrigir.', 'Clique no visto para concluir. O pedido não reserva stock: a disponibilidade é verificada e o stock descontado só nesse momento.']},
    {title:'Consultar e movimentar stock', icon:'fa-warehouse', route:'/stock', linkLabel:'Abrir Estoque', audience:'business',
      steps:['Localize o produto na lista de stock e abra as movimentações.', 'Confira o saldo, as entradas e as saídas.', 'Para registar uma movimentação, escolha o tipo e a quantidade e confira os dados antes de guardar.']},
    {title:'Consultar um recibo', icon:'fa-receipt', route:'/sales/salesHistory', linkLabel:'Abrir Histórico', audience:'business',
      steps:['Em Vendas › Histórico, pesquise pelo cliente ou pelo número da venda (ex.: #12).', 'Clique no ícone de recibo de uma venda concluída.', 'No recibo, escolha imprimir e selecione a impressora ou guardar como PDF.']},
    {title:'Analisar os resultados', icon:'fa-chart-line', route:'/dashboard', linkLabel:'Abrir Dashboard', audience:'manager',
      steps:['No Dashboard, escolha o período: Hoje, 7 dias, Mês atual ou Personalizado.', 'Compare a faturação, o número de vendas e o valor médio por venda com o período anterior.', 'Consulte os pedidos pendentes e os produtos a repor. Use os relatórios para ver os detalhes.']},
    {title:'Gerar um relatório', icon:'fa-file-lines', route:'/reports', linkLabel:'Abrir Relatórios', audience:'manager',
      steps:['Em Relatórios, escolha o tipo: Vendas, Stock atual ou Movimentos.', 'Defina o período (ou use Este mês, Mês passado, Este ano) e os filtros, e clique em Aplicar.', 'Exporte para Excel ou use Imprimir / PDF. Ambos levam o logótipo e todos os resultados do filtro.']},
    {title:'Gerir utilizadores', icon:'fa-users', route:'/users/allUser', linkLabel:'Abrir Utilizadores', audience:'admin',
      steps:['Em Adicionar utilizador, preencha o nome, a palavra-passe inicial e escolha o perfil (Gerente ou Utilizador).', 'Na lista, consulte ou edite; pode ativar ou desativar o acesso.', 'Uma alteração de permissões exige novo início de sessão. Não pode desativar a própria conta nem retirar o seu próprio perfil de administrador.']},
    {title:'Alterar a palavra-passe ou a foto', icon:'fa-user-gear', route:'/users/myProfile', linkLabel:'Abrir Perfil', audience:'all',
      steps:['Abra o Perfil a partir do seu nome no canto superior direito.', 'Clique na câmara para mudar a foto e depois em Guardar foto.', 'Para a palavra-passe, preencha a atual e a nova duas vezes. Terá de iniciar sessão outra vez.']}
  ];
  readonly questions: Question[] = [
    {title:'O pedido reserva stock?', answer:'Não. O stock só é verificado e descontado quando o pedido é concluído. Confirme a disponibilidade antes de prometer a entrega.', audience:'business'},
    {title:'É obrigatório selecionar um cliente na venda?', answer:'Não. A venda pode ser registada sem cliente; no recibo aparece “Consumidor final”. Nos pedidos, o cliente é obrigatório.', audience:'business'},
    {title:'Como corrigir uma quantidade de stock?', answer:'Confira primeiro o histórico para identificar a origem da diferença. Quando for necessária uma correção, registe uma movimentação de entrada ou saída com a quantidade correspondente e uma descrição clara do motivo.', audience:'business'},
    {title:'Porque não consigo concluir um pedido?', answer:'Confira a disponibilidade de todos os produtos e a mensagem apresentada. Se faltar stock, ajuste as quantidades ou registe a entrada real dos produtos antes de tentar novamente.', audience:'business'},
    {title:'A faturação do dashboard representa lucro?', answer:'Não. A faturação corresponde ao valor das vendas concluídas. Não desconta custos ou despesas. Os pedidos pendentes são apresentados separadamente.', audience:'manager'},
    {title:'Porque não vejo todas as opções do menu?', answer:'As opções dependem do perfil. O administrador gere utilizadores; o gerente acompanha a operação e os resultados; o utilizador trabalha com clientes, vendas e stock. O suporte está disponível para todos.', audience:'all'},
    {title:'Como ativar o modo escuro?', answer:'Clique no ícone da lua na barra de topo. A escolha fica guardada neste navegador; para voltar ao modo claro, clique no sol.', audience:'all'},
    {title:'O que fazer quando a sessão termina?', answer:'Inicie sessão novamente. Se houver uma operação por confirmar, consulte o histórico antes de a repetir para verificar se foi concluída.', audience:'all'},
    {title:'Que informações devo enviar ao reportar um problema?', answer:'Indique a tela, os passos que realizou, a hora aproximada e a mensagem de erro. Se possível, inclua uma captura sem palavras-passe, tokens ou dados pessoais desnecessários.', audience:'all'}
  ];
  constructor(private auth: AuthService) {}
  private allowed(audience: Question['audience']): boolean {
    if (audience === 'all') return true;
    if (this.auth.hasAnyRole(['ROLE_ADMIN'])) return audience === 'admin';
    return audience === 'manager' ? this.auth.hasAnyRole(['ROLE_MANAGER'])
      : audience === 'business' && this.auth.hasAnyRole(['ROLE_MANAGER', 'ROLE_USER']);
  }
  private matches(text: string): boolean {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalize(text).includes(normalize(this.query.trim()));
  }
  get visibleTopics(): HelpTopic[] {
    return this.topics.filter(topic => this.allowed(topic.audience) && this.matches(topic.title + ' ' + topic.steps.join(' ')));
  }
  get visibleQuestions(): Question[] {
    return this.questions.filter(question => this.allowed(question.audience) && this.matches(question.title + ' ' + question.answer));
  }
  get emailLink(): string { return 'mailto:' + this.contact.email + '?subject=' + encodeURIComponent('Suporte — SmartMarisco'); }
  get whatsappLink(): string { return 'https://wa.me/' + this.contact.whatsapp.replace(/\D/g, ''); }
}
