class Meta {
  constructor(id, nome, valorTotal, valorAcumulado = 0, cor = '#7BA8A1') {
    this.id = id;
    this.nome = nome;
    this.valorTotal = valorTotal;
    this.valorAcumulado = valorAcumulado;
    this.dataCriacao = new Date().toISOString();
    this.cor = cor;
  }

  alocarDinheiro(valor) {
    this.valorAcumulado += valor;
  }

  getProgresso() {
    if (this.valorTotal === 0) return 0;
    return Math.min(100, (this.valorAcumulado / this.valorTotal) * 100);
  }
}

class Transacao {
  constructor(id, tipo, valor, descricao, registradoPor, metaId = null) {
    this.id = id;
    this.tipo = tipo; // 'entrada' | 'saida' | 'alocacao'
    this.valor = valor;
    this.descricao = descricao;
    this.registradoPor = registradoPor;
    this.data = new Date().toISOString();
    this.metaId = metaId;
  }
}

class Casal {
  constructor(nomeParceiro1, nomeParceiro2, saldoInicial = 0, limiteMensal = 0) {
    this.nomeParceiro1 = nomeParceiro1;
    this.nomeParceiro2 = nomeParceiro2;
    this.saldo = saldoInicial;
    this.limiteMensal = limiteMensal;
    this.limiteRestante = limiteMensal;
    this.mesAtual = new Date().toISOString().slice(0, 7);
    this.metas = [];
    this.transacoes = [];
  }

  registrarEntrada(valor, descricao, registradoPor) {
    this.saldo += valor;
    this.transacoes.unshift(
      new Transacao(Date.now().toString(), 'entrada', valor, descricao, registradoPor)
    );
  }

  registrarSaida(valor, descricao, registradoPor) {
    this.saldo -= valor;
    this.limiteRestante -= valor;
    this.transacoes.unshift(
      new Transacao(Date.now().toString(), 'saida', valor, descricao, registradoPor)
    );
  }

  definirLimiteMensal(valor) {
    this.limiteMensal = valor;
    this.limiteRestante = valor;
  }

  resetarMes() {
    this.limiteRestante = this.limiteMensal;
    this.mesAtual = new Date().toISOString().slice(0, 7);
  }

  getSaldo() {
    return this.saldo;
  }

  criarMeta(nome, valorTotal, cor) {
    const meta = new Meta(Date.now().toString(), nome, valorTotal, 0, cor);
    this.metas.push(meta);
    return meta;
  }

  alocarParaMeta(metaId, valor, registradoPor) {
    const meta = this.metas.find(m => m.id === metaId);
    if (!meta || valor > this.saldo) return false;
    meta.alocarDinheiro(valor);
    this.saldo -= valor;
    this.transacoes.unshift(
      new Transacao(Date.now().toString(), 'alocacao', valor, `Alocação para meta: ${meta.nome}`, registradoPor, metaId)
    );
    return true;
  }


  static fromJSON(obj) {
    const casal = new Casal(obj.nomeParceiro1, obj.nomeParceiro2, obj.saldo, obj.limiteMensal);
    casal.saldo = obj.saldo;
    casal.limiteRestante = obj.limiteRestante;
    casal.mesAtual = obj.mesAtual;
    casal.metas = (obj.metas || []).map(m =>
      Object.assign(new Meta(m.id, m.nome, m.valorTotal, m.valorAcumulado, m.cor), m)
    );
    casal.transacoes = (obj.transacoes || []).map(t =>
      Object.assign(new Transacao(t.id, t.tipo, t.valor, t.descricao, t.registradoPor, t.metaId), t)
    );
    return casal;
  }
}


/*ARMAZENAMENTO */

class Storage {
  static CHAVE = 'henosis_casal';

  static salvar(casal) {
    localStorage.setItem(Storage.CHAVE, JSON.stringify(casal));
  }

  static carregar() {
    const raw = localStorage.getItem(Storage.CHAVE);
    if (!raw) return null;
    return Casal.fromJSON(JSON.parse(raw));
  }

  static limpar() {
    localStorage.removeItem(Storage.CHAVE);
  }
}




function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(isoString) {
  return new Date(isoString).toLocaleDateString('pt-BR');
}




let casal = null;




document.addEventListener('DOMContentLoaded', () => {
  casal = Storage.carregar();

  if (casal) {
    mostrarApp();
  }

  document.getElementById('form-setup').addEventListener('submit', (e) => {
    e.preventDefault();

    const nome1 = document.getElementById('input-nome1').value.trim();
    const nome2 = document.getElementById('input-nome2').value.trim();
    const saldo = parseFloat(document.getElementById('input-saldo').value) || 0;
    const limite = parseFloat(document.getElementById('input-limite').value) || 0;

    casal = new Casal(nome1, nome2, saldo, limite);
    Storage.salvar(casal);

    mostrarApp();
  });
});

function mostrarApp() {
  document.getElementById('screen-setup').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  configurarNavegacao();
  configurarTabsTransacao();
  configurarFormTransacao();
  configurarConfig();
  configurarMetas();
  configurarHistorico();

  renderizarDashboard();
}




function configurarNavegacao() {
  const botoes = document.querySelectorAll('.nav-item');

  botoes.forEach(btn => {
    btn.addEventListener('click', () => {
      botoes.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.screen-content').forEach(s => s.classList.add('hidden'));
      document.getElementById('screen-' + btn.dataset.screen).classList.remove('hidden');

      if (btn.dataset.screen === 'dashboard') renderizarDashboard();
      if (btn.dataset.screen === 'config') renderizarConfig();
      if (btn.dataset.screen === 'metas') renderizarListaMetas();
      if (btn.dataset.screen === 'historico') renderizarHistorico('todos');
    });
  });
}

function irPara(nomeTela) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const navCorrespondente = document.querySelector(`.nav-item[data-screen="${nomeTela}"]`);
  if (navCorrespondente) navCorrespondente.classList.add('active');

  document.querySelectorAll('.screen-content').forEach(s => s.classList.add('hidden'));
  document.getElementById('screen-' + nomeTela).classList.remove('hidden');
}




function configurarTabsTransacao() {
  const tabs = document.querySelectorAll('.tab');
  const botaoSubmit = document.getElementById('btn-transacao');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      botaoSubmit.textContent = tab.dataset.tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída';
    });
  });
}




function configurarFormTransacao() {
  const select = document.getElementById('input-autor');
  select.innerHTML = `
    <option value="${casal.nomeParceiro1}">${casal.nomeParceiro1}</option>
    <option value="${casal.nomeParceiro2}">${casal.nomeParceiro2}</option>
  `;

  document.getElementById('form-transacao').addEventListener('submit', (e) => {
    e.preventDefault();

    const tipo = document.querySelector('.tab.active').dataset.tipo;
    const valor = parseFloat(document.getElementById('input-valor').value);
    const descricao = document.getElementById('input-descricao').value.trim();
    const autor = document.getElementById('input-autor').value;

    if (tipo === 'entrada') {
      casal.registrarEntrada(valor, descricao, autor);
    } else {
      casal.registrarSaida(valor, descricao, autor);
    }

    Storage.salvar(casal);

    e.target.reset();
    irPara('dashboard');
    renderizarDashboard();
  });
}


/*  DASHBOARD */

function renderizarDashboard() {
  document.getElementById('saldo-total').textContent = formatarMoeda(casal.getSaldo());
  document.getElementById('limite-restante').textContent = formatarMoeda(casal.limiteRestante);
  document.getElementById('limite-total-sub').textContent = `de ${formatarMoeda(casal.limiteMensal)} no mês`;

  const totalMetas = casal.metas.reduce((soma, m) => soma + m.valorTotal, 0);
  document.getElementById('metas-total').textContent = formatarMoeda(totalMetas);
  document.getElementById('metas-sub').textContent =
    casal.metas.length === 1 ? '1 meta ativa' : `${casal.metas.length} metas ativas`;

  const containerMetas = document.getElementById('metas-dashboard');
  if (casal.metas.length === 0) {
    containerMetas.innerHTML = '<p class="vazio">Nenhuma meta criada ainda.</p>';
  } else {
    containerMetas.innerHTML = casal.metas.slice(0, 3).map(m => renderizarCardMeta(m, false)).join('');
  }

  const container = document.getElementById('ultimas-transacoes');
  const ultimas = casal.transacoes.slice(0, 5);

  if (ultimas.length === 0) {
    container.innerHTML = '<p class="vazio">Nenhuma movimentação registrada ainda.</p>';
    return;
  }

  container.innerHTML = ultimas.map(renderizarLinhaTransacao).join('');
}

function renderizarLinhaTransacao(t) {
  let sinal = '';
  let classe = 'alloc';
  if (t.tipo === 'entrada') { sinal = '+'; classe = 'in'; }
  if (t.tipo === 'saida') { sinal = '−'; classe = 'out'; }

  return `
    <div class="hist-row">
      <div>
        <div class="h-desc">${t.descricao}</div>
        <div class="h-meta">${formatarData(t.data)} · ${t.registradoPor}</div>
      </div>
      <div class="h-val ${classe}">${sinal}${formatarMoeda(t.valor)}</div>
    </div>
  `;
}


/*TELA DE CONFIGURAÇÕES */

function configurarConfig() {
  document.getElementById('btn-salvar-limite').addEventListener('click', () => {
    const novoLimite = parseFloat(document.getElementById('input-novo-limite').value);
    if (isNaN(novoLimite) || novoLimite < 0) return;

    casal.definirLimiteMensal(novoLimite);
    Storage.salvar(casal);
    renderizarConfig();
    alert('Limite mensal atualizado!');
  });

  document.getElementById('btn-resetar-mes').addEventListener('click', () => {
    casal.resetarMes();
    Storage.salvar(casal);
    renderizarConfig();
    alert('Mês reiniciado! O limite de gastos foi restaurado.');
  });

  document.getElementById('btn-limpar').addEventListener('click', () => {
    if (confirm('Isso vai apagar todos os dados do casal. Tem certeza?')) {
      Storage.limpar();
      location.reload();
    }
  });
}

function renderizarConfig() {
  document.getElementById('config-nomes').textContent = `${casal.nomeParceiro1} & ${casal.nomeParceiro2}`;
  document.getElementById('config-limite').textContent =
    `Limite atual: ${formatarMoeda(casal.limiteMensal)} · Restante este mês: ${formatarMoeda(casal.limiteRestante)}`;
  document.getElementById('config-mes').textContent = `Mês de referência: ${casal.mesAtual}`;
  document.getElementById('input-novo-limite').value = casal.limiteMensal;
}


// metas

let metaSelecionadaId = null;

function configurarMetas() {
  
  document.getElementById('btn-nova-meta').addEventListener('click', () => {
    irPara('nova-meta');
  });

  document.getElementById('btn-cancelar-meta').addEventListener('click', () => {
    document.getElementById('form-nova-meta').reset();
    irPara('metas');
    renderizarListaMetas();
  });

  document.getElementById('form-nova-meta').addEventListener('submit', (e) => {
    e.preventDefault();

    const nome = document.getElementById('input-meta-nome').value.trim();
    const valor = parseFloat(document.getElementById('input-meta-valor').value);
    const cor = document.getElementById('input-meta-cor').value;

    casal.criarMeta(nome, valor, cor);
    Storage.salvar(casal);

    e.target.reset();
    irPara('metas');
    renderizarListaMetas();
  });

  // Formulário de alocação
  document.getElementById('btn-cancelar-alocar').addEventListener('click', () => {
    document.getElementById('form-alocar').reset();
    irPara('metas');
    renderizarListaMetas();
  });

  document.getElementById('form-alocar').addEventListener('submit', (e) => {
    e.preventDefault();

    const valor = parseFloat(document.getElementById('input-alocar-valor').value);
    const autor = document.getElementById('input-alocar-autor').value;

    if (valor > casal.saldo) {
      alert('O valor a alocar não pode ser maior que o saldo disponível do casal.');
      return;
    }

    const sucesso = casal.alocarParaMeta(metaSelecionadaId, valor, autor);
    if (!sucesso) {
      alert('Não foi possível alocar o valor. Verifique o saldo disponível.');
      return;
    }

    Storage.salvar(casal);
    e.target.reset();
    irPara('metas');
    renderizarListaMetas();
  });
}

function renderizarListaMetas() {
  const container = document.getElementById('lista-metas');

  if (casal.metas.length === 0) {
    container.innerHTML = '<p class="vazio">Nenhuma meta criada ainda.</p>';
    return;
  }

  container.innerHTML = casal.metas.map(m => renderizarCardMeta(m, true)).join('');

  container.querySelectorAll('.btn-alocar').forEach(btn => {
    btn.addEventListener('click', () => {
      abrirTelaAlocar(btn.dataset.metaId);
    });
  });
}

function renderizarCardMeta(meta, comBotao) {
  const progresso = meta.getProgresso();
  const completa = progresso >= 100;

  return `
    <div class="goal-card">
      <div class="goal-top">
        <span class="goal-name">${meta.nome}${completa ? '<span class="goal-completa">Concluída</span>' : ''}</span>
        <span class="goal-pct" style="color:${meta.cor}">${progresso.toFixed(0)}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${progresso}%; background:${meta.cor}"></div>
      </div>
      <div class="goal-vals">
        <span>${formatarMoeda(meta.valorAcumulado)}</span>
        <span>de ${formatarMoeda(meta.valorTotal)}</span>
      </div>
      ${comBotao ? `
        <div class="goal-actions">
          <button class="btn btn-outline btn-sm btn-alocar" data-meta-id="${meta.id}">Alocar dinheiro</button>
        </div>
      ` : ''}
    </div>
  `;
}

function abrirTelaAlocar(metaId) {
  const meta = casal.metas.find(m => m.id === metaId);
  if (!meta) return;

  metaSelecionadaId = metaId;

  document.getElementById('alocar-nome-meta').textContent = meta.nome;
  document.getElementById('alocar-saldo-disponivel').textContent =
    `Saldo disponível do casal: ${formatarMoeda(casal.saldo)}`;

  const select = document.getElementById('input-alocar-autor');
  select.innerHTML = `
    <option value="${casal.nomeParceiro1}">${casal.nomeParceiro1}</option>
    <option value="${casal.nomeParceiro2}">${casal.nomeParceiro2}</option>
  `;

  irPara('alocar');
}


/*HISTÓRICO*/

function configurarHistorico() {
  document.querySelectorAll('.filtro-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filtro-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderizarHistorico(tab.dataset.filtro);
    });
  });
}

function renderizarHistorico(filtro) {
  const container = document.getElementById('lista-historico');

  const transacoes = filtro === 'todos'
    ? casal.transacoes
    : casal.transacoes.filter(t => t.tipo === filtro);

  if (transacoes.length === 0) {
    container.innerHTML = '<p class="vazio">Nenhuma movimentação encontrada.</p>';
    return;
  }

  container.innerHTML = transacoes.map(renderizarLinhaTransacao).join('');
}
