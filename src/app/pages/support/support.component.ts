import { Component } from '@angular/core';
import { AuthService } from '@app/services/auth.service';
import { SUPPORT_CONTACT } from '@app/config/support.config';

interface HelpTopic {
  title: string;
  icon: string;
  route: string;
  steps: string[];
  audience: 'business' | 'manager' | 'admin';
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
    {title:'Registar uma venda', icon:'fa-cart-shopping', route:'/sales/sale', audience:'business',
      steps:['Escolha o produto e a quantidade e adicione à venda.', 'Selecione um cliente se desejar; a venda também pode ser feita sem cliente.', 'Confira os artigos e o total antes de processar. Após concluir, pode consultar e imprimir o recibo.']},
    {title:'Concluir um pedido', icon:'fa-clipboard-list', route:'/sales/orderHistory', audience:'business',
      steps:['Abra o histórico de pedidos e localize o pedido.', 'Confira os produtos e as quantidades antes de concluir.', 'O pedido não reserva stock. A disponibilidade é verificada e o stock é descontado ao concluir.']},
    {title:'Consultar e movimentar stock', icon:'fa-warehouse', route:'/stock', audience:'business',
      steps:['Localize o produto na lista de stock e abra as movimentações.', 'Confira o saldo, as entradas e as saídas.', 'Para registar uma movimentação, escolha o tipo e a quantidade e confira os dados antes de guardar.']},
    {title:'Consultar um recibo', icon:'fa-receipt', route:'/sales/salesHistory', audience:'business',
      steps:['Abra o histórico de vendas e localize uma venda concluída.', 'Use a ação de ver recibo.', 'No recibo, escolha imprimir e selecione a impressora ou guardar como PDF.']},
    {title:'Analisar os resultados', icon:'fa-chart-line', route:'/dashboard', audience:'manager',
      steps:['Escolha o período no dashboard.', 'Compare a faturação, o número de vendas e o valor médio por venda com o período anterior.', 'Consulte os pedidos pendentes e os produtos a repor. Use os relatórios para ver os detalhes.']},
    {title:'Gerir utilizadores', icon:'fa-users', route:'/users/allUser', audience:'admin',
      steps:['Localize o utilizador na lista e escolha consultar ou editar.', 'Confira o nome e os perfis antes de guardar. Pode ativar ou desativar o acesso.', 'Uma alteração de permissões exige novo início de sessão. Não pode desativar a própria conta nem retirar o seu próprio perfil de administrador.']}
  ];
  readonly questions: Question[] = [
    {title:'O pedido reserva stock?', answer:'Não. O stock só é verificado e descontado quando o pedido é concluído. Confirme a disponibilidade antes de prometer a entrega.', audience:'business'},
    {title:'É obrigatório selecionar um cliente na venda?', answer:'Não. A venda pode ser registada sem cliente; no recibo aparece “Consumidor final”. Nos pedidos, o cliente é obrigatório.', audience:'business'},
    {title:'Como corrigir uma quantidade de stock?', answer:'Confira primeiro o histórico para identificar a origem da diferença. Quando for necessária uma correção, registe uma movimentação de entrada ou saída com a quantidade correspondente e uma descrição clara do motivo.', audience:'business'},
    {title:'Porque não consigo concluir um pedido?', answer:'Confira a disponibilidade de todos os produtos e a mensagem apresentada. Se faltar stock, ajuste as quantidades ou registe a entrada real dos produtos antes de tentar novamente.', audience:'business'},
    {title:'A faturação do dashboard representa lucro?', answer:'Não. A faturação corresponde ao valor das vendas concluídas. Não desconta custos ou despesas. Os pedidos pendentes são apresentados separadamente.', audience:'manager'},
    {title:'Porque não vejo todas as opções do menu?', answer:'As opções dependem do perfil. O administrador gere utilizadores; o gerente acompanha a operação e os resultados; o utilizador trabalha com clientes, vendas e stock. O suporte está disponível para todos.', audience:'all'},
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
