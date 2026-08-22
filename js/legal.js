const TERMOS_HTML = `
<div class="legal-section-title">O que é o Você S.A.</div>
<div class="legal-p">Uma ferramenta pessoal de acompanhamento de hábitos e metas — check-in diário, OKRs trimestrais, biblioteca de aprendizado e controle financeiro básico. Não é aconselhamento médico, financeiro, psicológico ou profissional de nenhum tipo: é um sistema de registro e organização, as decisões são sempre suas.</div>

<div class="legal-section-title">Sua conta</div>
<div class="legal-p">Você é responsável por manter sua senha em segurança. Cada conta é pessoal e intransferível. Se perceber uso não autorizado, troque a senha em Perfil ou entre em contato.</div>

<div class="legal-section-title">Uso aceitável</div>
<div class="legal-p">Não use o app para fins ilegais, não tente acessar dados de outras contas, não faça engenharia reversa do sistema. O app está em fase beta — funcionalidades podem mudar ou ser ajustadas conforme o produto evolui.</div>

<div class="legal-section-title">Cancelamento</div>
<div class="legal-p">Você pode excluir sua conta a qualquer momento em Perfil → Zona de perigo. A exclusão é permanente e apaga login, check-ins, biblioteca e configurações — não há como desfazer.</div>

<div class="legal-section-title">Isenção de responsabilidade</div>
<div class="legal-p">O app é fornecido "como está". Fazemos o possível para manter tudo funcionando e os dados seguros, mas não garantimos resultado algum sobre suas metas pessoais — o progresso depende do seu uso, não do software.</div>

<div class="legal-section-title">Contato</div>
<div class="legal-p">Dúvidas ou problemas: gvmediabr@gmail.com</div>
`;

const PRIVACIDADE_HTML = `
<div class="legal-section-title">Dados que coletamos</div>
<div class="legal-p">Email e senha (autenticação), check-ins diários (hábitos marcados, energia, notas de texto opcionais), valores financeiros que você mesmo lança, peso (campo opcional na revisão mensal), itens da Biblioteca, e o endereço técnico do seu dispositivo para notificações push — apenas se você ativar essa função.</div>

<div class="legal-section-title">Onde os dados ficam</div>
<div class="legal-p">Em um banco de dados do Supabase, um provedor de infraestrutura terceirizado. Não vendemos, alugamos ou compartilhamos seus dados com mais ninguém, para nenhum outro fim.</div>

<div class="legal-section-title">Para que usamos</div>
<div class="legal-p">Só para o app funcionar: calcular seu progresso, sequência e retrospectivas, e enviar as notificações que você mesmo ativou (lembrete diário, resumo semanal). Nunca para publicidade ou para treinar modelos de terceiros.</div>

<div class="legal-section-title">Armazenamento local</div>
<div class="legal-p">Usamos o armazenamento local do navegador para guardar sua sessão, tema (claro/escuro) e rascunhos não salvos — não é rastreamento de terceiros, fica só no seu dispositivo.</div>

<div class="legal-section-title">Notificações push</div>
<div class="legal-p">Totalmente opcionais (opt-in) e revogáveis a qualquer momento em Perfil → Lembrete diário.</div>

<div class="legal-section-title">Seus direitos</div>
<div class="legal-p">Exportar todos os seus dados (CSV ou JSON) e excluir sua conta permanentemente — ambos disponíveis a qualquer momento em Perfil.</div>

<div class="legal-section-title">Contato</div>
<div class="legal-p">Dúvidas sobre seus dados: gvmediabr@gmail.com</div>
`;

export function showLegal(tab) {
  const el = document.getElementById('pg-legal');
  if (el) el.style.display = 'block';
  setLegalTab(tab || 'termos');
}

export function closeLegal() {
  const el = document.getElementById('pg-legal');
  if (el) el.style.display = 'none';
}

export function setLegalTab(tab, el) {
  document.querySelectorAll('#pg-legal .ptab').forEach(b => b.classList.remove('on'));
  if (el) {
    el.classList.add('on');
  } else {
    const btn = document.querySelector(`#pg-legal .ptab[data-tab="${tab}"]`);
    if (btn) btn.classList.add('on');
  }
  const content = document.getElementById('legal-content');
  if (content) content.innerHTML = tab === 'privacidade' ? PRIVACIDADE_HTML : TERMOS_HTML;
}
