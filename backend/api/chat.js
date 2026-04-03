const { v4: uuidv4 } = require('uuid');

// Procedimentos disponíveis
const PROCEDIMENTOS = [
  { id: '1', nome: 'Limpeza', preco: 120 },
  { id: '2', nome: 'Clareamento', preco: 800 },
  { id: '3', nome: 'Extração', preco: 300 },
  { id: '4', nome: 'Ortodontia (avaliação)', preco: 100 }
];

// Formas de pagamento
const PAGAMENTOS = [
  { id: '1', nome: 'PIX', desconto: 10 },
  { id: '2', nome: 'Cartão de crédito', desconto: 0 },
  { id: '3', nome: 'Dinheiro', desconto: 0 }
];

// Horários disponíveis
function getHorariosDisponiveis() {
  return ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
}

// Armazenar sessões
const sessions = new Map();

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { message, sessionId } = req.body;
    
    // Recuperar ou criar sessão
    let session = sessions.get(sessionId);
    if (!session) {
      session = { step: 'nome', data: {} };
      sessions.set(sessionId, session);
    }
    
    let responseMessage = '';
    let responseOptions = [];
    let nextStep = session.step;
    
    // Processar cada etapa
    if (session.step === 'nome') {
      if (!message) {
        responseMessage = "Olá! 👋 Bem-vindo à clínica odontológica Sorriso Perfeito.\n\nQual é o seu nome?";
      } else {
        session.data.nome = message;
        nextStep = 'procedimento';
        responseMessage = `Prazer em conhecê-lo, ${message}! 🦷\n\nQual procedimento você deseja?\n\n1 - Limpeza (R$120)\n2 - Clareamento (R$800)\n3 - Extração (R$300)\n4 - Ortodontia (R$100)\n\nDigite o número:`;
        responseOptions = [
          { text: "Limpeza - R$120", value: "1" },
          { text: "Clareamento - R$800", value: "2" },
          { text: "Extração - R$300", value: "3" },
          { text: "Ortodontia - R$100", value: "4" }
        ];
      }
    }
    else if (session.step === 'procedimento') {
      const procedimento = PROCEDIMENTOS.find(p => p.id === message);
      if (!procedimento) {
        responseMessage = "Opção inválida! Escolha 1, 2, 3 ou 4:";
        responseOptions = [
          { text: "Limpeza - R$120", value: "1" },
          { text: "Clareamento - R$800", value: "2" },
          { text: "Extração - R$300", value: "3" },
          { text: "Ortodontia - R$100", value: "4" }
        ];
      } else {
        session.data.procedimento = procedimento;
        nextStep = 'data';
        responseMessage = `Ótimo! ${procedimento.nome} - R$ ${procedimento.preco}\n\nQual data você quer agendar? (DD/MM/AAAA)\n\nExemplo: 15/04/2024`;
      }
    }
    else if (session.step === 'data') {
      // Validar data simples
      if (!message || message.length < 8) {
        responseMessage = "Data inválida! Digite no formato DD/MM/AAAA\n\nExemplo: 15/04/2024";
      } else {
        session.data.data = message;
        nextStep = 'horario';
        const horarios = getHorariosDisponiveis();
        responseMessage = `Data escolhida: ${message}\n\nHorários disponíveis:\n${horarios.join(', ')}\n\nDigite o horário desejado:`;
        responseOptions = horarios.map(h => ({ text: h, value: h }));
      }
    }
    else if (session.step === 'horario') {
      const horarios = getHorariosDisponiveis();
      if (!horarios.includes(message)) {
        responseMessage = `Horário inválido! Escolha um desses: ${horarios.join(', ')}`;
        responseOptions = horarios.map(h => ({ text: h, value: h }));
      } else {
        session.data.horario = message;
        nextStep = 'pagamento';
        responseMessage = `Horário escolhido: ${message}\n\nFormas de pagamento:\n\n1 - PIX (10% desconto)\n2 - Cartão de crédito\n3 - Dinheiro\n\nDigite o número:`;
        responseOptions = [
          { text: "PIX (10% desconto)", value: "1" },
          { text: "Cartão de crédito", value: "2" },
          { text: "Dinheiro", value: "3" }
        ];
      }
    }
    else if (session.step === 'pagamento') {
      const pagamento = PAGAMENTOS.find(p => p.id === message);
      if (!pagamento) {
        responseMessage = "Opção inválida! Escolha 1, 2 ou 3:";
        responseOptions = [
          { text: "PIX (10% desconto)", value: "1" },
          { text: "Cartão de crédito", value: "2" },
          { text: "Dinheiro", value: "3" }
        ];
      } else {
        session.data.pagamento = pagamento;
        
        // Calcular valor final
        let valorFinal = session.data.procedimento.preco;
        if (pagamento.desconto > 0) {
          valorFinal = valorFinal - (valorFinal * pagamento.desconto / 100);
        }
        session.data.valorFinal = valorFinal;
        
        nextStep = 'confirmar';
        responseMessage = `📋 CONFIRMAR AGENDAMENTO:\n\n` +
          `Nome: ${session.data.nome}\n` +
          `Procedimento: ${session.data.procedimento.nome}\n` +
          `Valor: R$ ${valorFinal.toFixed(2)}${pagamento.desconto > 0 ? ` (com ${pagamento.desconto}% de desconto)` : ''}\n` +
          `Data: ${session.data.data}\n` +
          `Horário: ${session.data.horario}\n` +
          `Pagamento: ${pagamento.nome}\n\n` +
          `Digite 1 para CONFIRMAR ou 2 para CANCELAR`;
        responseOptions = [
          { text: "✅ Confirmar agendamento", value: "1" },
          { text: "❌ Cancelar", value: "2" }
        ];
      }
    }
    else if (session.step === 'confirmar') {
      if (message === '1') {
        // Salvar agendamento
        const appointment = {
          id: uuidv4(),
          nome: session.data.nome,
          procedimento: session.data.procedimento.nome,
          valor: session.data.valorFinal,
          data: session.data.data,
          horario: session.data.horario,
          pagamento: session.data.pagamento.nome,
          dataAgendamento: new Date().toISOString()
        };
        
        responseMessage = `✅ AGENDAMENTO CONFIRMADO!\n\n` +
          `Nome: ${appointment.nome}\n` +
          `Procedimento: ${appointment.procedimento}\n` +
          `Data: ${appointment.data}\n` +
          `Horário: ${appointment.horario}\n` +
          `Pagamento: ${appointment.pagamento}\n` +
          `Valor: R$ ${appointment.valor.toFixed(2)}\n\n` +
          `📌 Entraremos em contato caso necessário.\n\n` +
          `Obrigado por escolher nossa clínica! 🦷✨\n\n` +
          `Deseja fazer outro agendamento? Digite SIM`;
        
        responseOptions = [{ text: "🔄 Fazer novo agendamento", value: "SIM" }];
        nextStep = 'finalizado';
        
        console.log('Agendamento salvo:', appointment);
      } else {
        responseMessage = `❌ Agendamento cancelado.\n\nDeseja recomeçar? Digite SIM`;
        responseOptions = [{ text: "🔄 Recomeçar", value: "SIM" }];
        nextStep = 'cancelado';
      }
    }
    else if (session.step === 'finalizado' || session.step === 'cancelado') {
      if (message === 'SIM') {
        // Resetar sessão
        sessions.set(sessionId, { step: 'nome', data: {} });
        responseMessage = "Olá! 👋 Bem-vindo à clínica odontológica Sorriso Perfeito.\n\nQual é o seu nome?";
        nextStep = 'nome';
      } else {
        responseMessage = "Obrigado pela visita! Volte sempre! 👋";
        responseOptions = [];
      }
    }
    
    // Atualizar step da sessão
    session.step = nextStep;
    sessions.set(sessionId, session);
    
    res.status(200).json({
      success: true,
      message: responseMessage,
      options: responseOptions
    });
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};
