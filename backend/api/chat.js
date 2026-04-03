const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_PATH = path.join(process.cwd(), 'data', 'appointments.json');

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

function readData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ appointments: [], conversations: [] }, null, 2));
  }
  const data = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(data);
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function isWeekend(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0; // Domingo
}

function isSaturday(dateStr) {
  const date = new Date(dateStr);
  return date.getDay() === 6;
}

function getAvailableHours(dateStr) {
  if (isWeekend(dateStr)) {
    return []; // Domingo fechado
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
      options: [],
      step: this.step
    };
  }

  handleName(name) {
    if (!name || name.trim().length < 2) {
      return {
        message: "Por favor, digite seu nome completo:",
        options: [],
        step: this.step
      };
    }
    this.data.nome = name.trim();
    this.step = 'ask_procedure';
    
    const procedureList = PROCEDIMENTOS.map(p => 
      `${p.nome} - R$ ${p.preco.toFixed(2)}`
    ).join('\n');
    
    return {
      message: `Prazer em conhecê-lo, ${this.data.nome}! 🦷\n\nQual procedimento você gostaria de realizar?\n\n${procedureList}\n\nDigite o número correspondente:\n1 - Limpeza\n2 - Clareamento\n3 - Extração\n4 - Ortodontia`,
      options: [
        { text: "Limpeza (R$120)", value: "limpeza" },
        { text: "Clareamento (R$800)", value: "clareamento" },
        { text: "Extração (R$300)", value: "extracao" },
        { text: "Ortodontia (R$100)", value: "ortodontia" }
      ],
      step: this.step
    };
  }

  handleProcedure(choice) {
    let procedureId;
    if (choice === '1' || choice === 'limpeza') procedureId = 'limpeza';
    else if (choice === '2' || choice === 'clareamento') procedureId = 'clareamento';
    else if (choice === '3' || choice === 'extracao') procedureId = 'extracao';
    else if (choice === '4' || choice === 'ortodontia') procedureId = 'ortodontia';
    else {
      return {
        message: "Opção inválida. Por favor, escolha uma opção de 1 a 4:",
        options: [
          { text: "Limpeza (R$120)", value: "limpeza" },
          { text: "Clareamento (R$800)", value: "clareamento" },
          { text: "Extração (R$300)", value: "extracao" },
          { text: "Ortodontia (R$100)", value: "ortodontia" }
        ],
        step: this.step
      };
    }
    
    const procedure = PROCEDIMENTOS.find(p => p.id === procedureId);
    this.data.procedimento = procedure;
    this.step = 'ask_date';
    
    return {
      message: `Ótima escolha! ${procedure.nome} - R$ ${procedure.preco.toFixed(2)}\n\nQual data você gostaria de agendar? (Formato: DD/MM/AAAA)\n\n📅 Segunda a Sexta: 09h às 18h\n📅 Sábado: 09h às 13h\n❌ Domingo: Fechado`,
      options: [],
      step: this.step
    };
  }

  handleDate(dateStr) {
    // Validar formato DD/MM/AAAA
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateStr)) {
      return {
        message: "Formato inválido! Por favor, digite a data no formato DD/MM/AAAA:\n\nExemplo: 25/12/2024",
        options: [],
        step: this.step
      };
    }
    
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return {
        message: "❌ Data inválida! Por favor, escolha uma data futura:\n\nFormato: DD/MM/AAAA",
        options: [],
        step: this.step
      };
    }
    
    const availableHours = getAvailableHours(dateStr);
    if (availableHours.length === 0) {
      return {
        message: "❌ Desculpe, não atendemos aos domingos. Por favor, escolha uma data de segunda a sábado:",
        options: [],
        step: this.step
      };
    }
    
    this.data.data = dateStr;
    this.step = 'ask_time';
    
    const hoursList = availableHours.join(', ');
    const options = availableHours.map(hour => ({ text: hour, value: hour }));
    
    return {
      message: `📅 Data escolhida: ${dateStr}\n\nHorários disponíveis:\n${hoursList}\n\nDigite o horário desejado:`,
      options: options,
      step: this.step
    };
  }

  handleTime(time) {
    const availableHours = getAvailableHours(this.data.data);
    
    if (!availableHours.includes(time)) {
      return {
        message: `❌ Horário inválido! Horários disponíveis: ${availableHours.join(', ')}\n\nDigite um horário válido:`,
        options: availableHours.map(hour => ({ text: hour, value: hour })),
        step: this.step
      };
    }
    
    this.data.horario = time;
    this.step = 'ask_payment';
    
    const paymentList = PAGAMENTOS.map(p => {
      if (p.desconto > 0) {
        const precoComDesconto = this.data.procedimento.preco * (1 - p.desconto / 100);
        return `${p.nome} - ${p.desconto}% desconto (R$ ${precoComDesconto.toFixed(2)})`;
      }
      return `${p.nome} - R$ ${this.data.procedimento.preco.toFixed(2)}`;
    }).join('\n');
    
    return {
      message: `⏰ Horário escolhido: ${time}\n\n💰 Formas de pagamento:\n\n${paymentList}\n\nDigite o número correspondente:\n1 - PIX (10% desconto)\n2 - Cartão de crédito\n3 - Dinheiro`,
      options: [
        { text: "PIX (10% desconto)", value: "pix" },
        { text: "Cartão de crédito", value: "cartao" },
        { text: "Dinheiro", value: "dinheiro" }
      ],
      step: this.step
    };
  }

  handlePayment(choice) {
    let paymentId;
    if (choice === '1' || choice === 'pix') paymentId = 'pix';
    else if (choice === '2' || choice === 'cartao') paymentId = 'cartao';
    else if (choice === '3' || choice === 'dinheiro') paymentId = 'dinheiro';
    else {
      return {
        message: "Opção inválida! Escolha 1, 2 ou 3:",
        options: [
          { text: "PIX (10% desconto)", value: "pix" },
          { text: "Cartão de crédito", value: "cartao" },
          { text: "Dinheiro", value: "dinheiro" }
        ],
        step: this.step
      };
    }
    
    const payment = PAGAMENTOS.find(p => p.id === paymentId);
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
    
    const confirmMessage = `📋 Por favor, confirme seus dados:\n\n👤 Nome: ${this.data.nome}\n🦷 Procedimento: ${this.data.procedimento.nome}\n💰 Valor: R$ ${this.data.procedimento.preco.toFixed(2)}\n${payment.desconto > 0 ? `🎉 Desconto: -R$ ${desconto.toFixed(2)}\n💵 Valor final: R$ ${valorFinal.toFixed(2)}\n` : ''}📅 Data: ${this.data.data}\n⏰ Horário: ${this.data.horario}\n💳 Pagamento: ${payment.nome}\n\nDeseja confirmar o agendamento?\n\nDigite 1 para SIM ou 2 para CANCELAR`;
    
    return {
      message: confirmMessage,
      options: [
        { text: "✅ Sim, confirmar", value: "confirm" },
        { text: "❌ Cancelar", value: "cancel" }
      ],
      step: this.step
    };
  }

  handleConfirm(choice) {
    if (choice === '1' || choice === 'confirm' || choice === 'sim') {
      // Salvar agendamento
      const appointment = {
        id: uuidv4(),
        nome: this.data.nome,
        procedimento: this.data.procedimento,
        data: this.data.data,
        horario: this.data.horario,
        pagamento: this.data.pagamento.nome,
        valorOriginal: this.data.procedimento.preco,
        desconto: this.data.desconto,
        valorFinal: this.data.valorFinal,
        createdAt: new Date().toISOString(),
        status: 'agendado'
      };
      
      const db = readData();
      db.appointments.push(appointment);
      writeData(db);
      
      const finalMessage = `✅ AGENDAMENTO CONFIRMADO!\n\n👤 Nome: ${this.data.nome}\n🦷 Procedimento: ${this.data.procedimento.nome}\n💰 Valor: R$ ${this.data.valorFinal.toFixed(2)}\n📅 Data: ${this.data.data}\n⏰ Horário: ${this.data.horario}\n💳 Pagamento: ${this.data.pagamento.nome}\n\n📌 Entraremos em contato caso necessário.\n\nObrigado por escolher a clínica Sorriso Perfeito! 🦷✨\n\nDeseja fazer um novo agendamento? Digite "sim" para recomeçar.`;
      
      this.step = 'finished';
      
      return {
        message: finalMessage,
        options: [{ text: "🔄 Novo agendamento", value: "reset" }],
        step: this.step,
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

// Armazenar sessões (em produção, usar Redis)
const sessions = new Map();

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    const { message, sessionId } = req.body;
    
    let session = sessions.get(sessionId);
    if (!session) {
      session = new ChatSession(sessionId);
      sessions.set(sessionId, session);
    }
    
    const response = session.processMessage(message);
    
    res.json({
      success: true,
      message: response.message,
      options: response.options,
      step: response.step,
      appointment: response.appointment
    });
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
};
