const { v4: uuidv4 } = require('uuid');

// Procedimentos disponíveis
const PROCEDIMENTOS = [
  { id: 'limpeza', nome: 'Limpeza', preco: 120 },
  { id: 'clareamento', nome: 'Clareamento', preco: 800 },
  { id: 'extracao', nome: 'Extração', preco: 300 },
  { id: 'ortodontia', nome: 'Ortodontia (avaliação)', preco: 100 }
];

// Formas de pagamento
const PAGAMENTOS = [
  { id: 'pix', nome: 'PIX', desconto: 10 },
  { id: 'cartao', nome: 'Cartão de crédito', desconto: 0 },
  { id: 'dinheiro', nome: 'Dinheiro', desconto: 0 }
];

// Horários disponíveis
const HORARIOS = {
  weekday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
  saturday: ['09:00', '10:00', '11:00']
};

function isWeekend(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0;
}

function isSaturday(dateStr) {
  const date = new Date(dateStr);
  return date.getDay() === 6;
}

function getAvailableHours(dateStr) {
  if (isWeekend(dateStr)) {
    return [];
  }
  if (isSaturday(dateStr)) {
    return HORARIOS.saturday;
  }
  return HORARIOS.weekday;
}

// Estado do chat
class ChatSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.step = 'greeting';
    this.data = {};
  }

  processMessage(message) {
    switch(this.step) {
      case 'greeting':
        return this.handleGreeting();
      case 'ask_name':
        return this.handleName(message);
      case 'ask_procedure':
        return this.handleProcedure(message);
      case 'ask_date':
        return this.handleDate(message);
      case 'ask_time':
        return this.handleTime(message);
      case 'ask_payment':
        return this.handlePayment(message);
      case 'confirm':
        return this.handleConfirm(message);
      default:
        return this.handleReset();
    }
  }

  handleGreeting() {
    this.step = 'ask_name';
    return {
      message: "Olá! 👋 Bem-vindo à clínica odontológica Sorriso Perfeito.\n\nVamos agendar seu atendimento? Qual é o seu nome?",
      options: []
    };
  }

  handleName(name) {
    if (!name || name.trim().length < 2) {
      return {
        message: "Por favor, digite seu nome completo:",
        options: []
      };
    }
    this.data.nome = name.trim();
    this.step = 'ask_procedure';
    
    return {
      message: `Prazer em conhecê-lo, ${this.data.nome}! 🦷\n\nQual procedimento você gostaria de realizar?\n\n1 - Limpeza (R$120)\n2 - Clareamento (R$800)\n3 - Extração (R$300)\n4 - Ortodontia (R$100)\n\nDigite o número correspondente:`,
      options: [
        { text: "Limpeza (R$120)", value: "1" },
        { text: "Clareamento (R$800)", value: "2" },
        { text: "Extração (R$300)", value: "3" },
        { text: "Ortodontia (R$100)", value: "4" }
      ]
    };
  }

  handleProcedure(choice) {
    let procedure;
    if (choice === '1') procedure = PROCEDIMENTOS[0];
    else if (choice === '2') procedure = PROCEDIMENTOS[1];
    else if (choice === '3') procedure = PROCEDIMENTOS[2];
    else if (choice === '4') procedure = PROCEDIMENTOS[3];
    else {
      return {
        message: "Opção inválida. Por favor, escolha uma opção de 1 a 4:",
        options: [
          { text: "Limpeza (R$120)", value: "1" },
          { text: "Clareamento (R$800)", value: "2" },
          { text: "Extração (R$300)", value: "3" },
          { text: "Ortodontia (R$100)", value: "4" }
        ]
      };
    }
    
    this.data.procedimento = procedure;
    this.step = 'ask_date';
    
    return {
      message: `Ótima escolha! ${procedure.nome} - R$ ${procedure.preco.toFixed(2)}\n\nQual data você gostaria de agendar? (Formato: DD/MM/AAAA)\n\n📅 Segunda a Sexta: 09h às 18h\n📅 Sábado: 09h às 13h\n❌ Domingo: Fechado`,
      options: []
    };
  }

  handleDate(dateStr) {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateStr)) {
      return {
        message: "Formato inválido! Por favor, digite a data no formato DD/MM/AAAA:\n\nExemplo: 25/12/2024",
        options: []
      };
    }
    
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return {
        message: "❌ Data inválida! Por favor, escolha uma data futura:\n\nFormato: DD/MM/AAAA",
        options: []
      };
    }
    
    const availableHours = getAvailableHours(dateStr);
    if (availableHours.length === 0) {
      return {
        message: "❌ Desculpe, não atendemos aos domingos. Por favor, escolha uma data de segunda a sábado:",
        options: []
      };
    }
    
    this.data.data = dateStr;
    this.step = 'ask_time';
    
    const hoursList = availableHours.join(', ');
    const options = availableHours.map(hour => ({ text: hour, value: hour }));
    
    return {
      message: `📅 Data escolhida: ${dateStr}\n\nHorários disponíveis:\n${hoursList}\n\nDigite o horário desejado:`,
      options: options
    };
  }

  handleTime(time) {
    const availableHours = getAvailableHours(this.data.data);
    
    if (!availableHours.includes(time)) {
      return {
        message: `❌ Horário inválido! Horários disponíveis: ${availableHours.join(', ')}\n\nDigite um horário válido:`,
        options: availableHours.map(hour => ({ text: hour, value: hour }))
      };
    }
    
    this.data.horario = time;
    this.step = 'ask_payment';
    
    return {
      message: `⏰ Horário escolhido: ${time}\n\n💰 Formas de pagamento:\n\n1 - PIX (10% desconto)\n2 - Cartão de crédito\n3 - Dinheiro\n\nDigite o número correspondente:`,
      options: [
        { text: "PIX (10% desconto)", value: "1" },
        { text: "Cartão de crédito", value: "2" },
        { text: "Dinheiro", value: "3" }
      ]
    };
  }

  handlePayment(choice) {
    let payment;
    if (choice === '1') payment = PAGAMENTOS[0];
    else if (choice === '2') payment = PAGAMENTOS[1];
    else if (choice === '3') payment = PAGAMENTOS[2];
    else {
      return {
        message: "Opção inválida! Escolha 1, 2 ou 3:",
        options: [
          { text: "PIX (10% desconto)", value: "1" },
          { text: "Cartão de crédito", value: "2" },
          { text: "Dinheiro", value: "3" }
        ]
      };
    }
    
    let valorFinal = this.data.procedimento.preco;
    let desconto = 0;
    
    if (payment.desconto > 0) {
      desconto = (this.data.procedimento.preco * payment.desconto) / 100;
      valorFinal = this.data.procedimento.preco - desconto;
    }
    
    this.data.pagamento = payment;
    this.data.valorFinal = valorFinal;
    this.data.desconto = desconto;
    this.step = 'confirm';
    
    let confirmMessage = `📋 Por favor, confirme seus dados:\n\n👤 Nome: ${this.data.nome}\n🦷 Procedimento: ${this.data.procedimento.nome}\n💰 Valor: R$ ${this.data.procedimento.preco.toFixed(2)}`;
    
    if (payment.desconto > 0) {
      confirmMessage += `\n🎉 Desconto: -R$ ${desconto.toFixed(2)}\n💵 Valor final: R$ ${valorFinal.toFixed(2)}`;
    }
    
    confirmMessage += `\n📅 Data: ${this.data.data}\n⏰ Horário: ${this.data.horario}\n💳 Pagamento: ${payment.nome}\n\nDeseja confirmar o agendamento?\n\nDigite 1 para SIM ou 2 para CANCELAR`;
    
    return {
      message: confirmMessage,
      options: [
        { text: "✅ Sim, confirmar", value: "1" },
        { text: "❌ Cancelar", value: "2" }
      ]
    };
  }

  handleConfirm(choice) {
    if (choice === '1') {
      const appointment = {
        id: uuidv4(),
        nome: this.data.nome,
        procedimento: this.data.procedimento.nome,
        preco: this.data.valorFinal,
        data: this.data.data,
        horario: this.data.horario,
        pagamento: this.data.pagamento.nome,
        createdAt: new Date().toISOString()
      };
      
      const finalMessage = `✅ AGENDAMENTO CONFIRMADO!\n\n👤 Nome: ${this.data.nome}\n🦷 Procedimento: ${this.data.procedimento.nome}\n💰 Valor: R$ ${this.data.valorFinal.toFixed(2)}\n📅 Data: ${this.data.data}\n⏰ Horário: ${this.data.horario}\n💳 Pagamento: ${this.data.pagamento.nome}\n\n📌 Entraremos em contato caso necessário.\n\nObrigado por escolher a clínica Sorriso Perfeito! 🦷✨\n\nDeseja fazer um novo agendamento? Digite "sim" para recomeçar.`;
      
      this.step = 'finished';
      
      return {
        message: finalMessage,
        options: [{ text: "🔄 Novo agendamento", value: "sim" }],
        appointment: appointment
      };
    } else {
      return this.handleReset();
    }
  }

  handleReset() {
    this.step = 'greeting';
    this.data = {};
    return this.handleGreeting();
  }
}

const sessions = new Map();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    try {
      const { message, sessionId } = req.body;
      
      let session = sessions.get(sessionId);
      if (!session) {
        session = new ChatSession(sessionId);
        sessions.set(sessionId, session);
      }
      
      const response = session.processMessage(message);
      
      res.status(200).json({
        success: true,
        message: response.message,
        options: response.options || [],
        appointment: response.appointment || null
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
};
