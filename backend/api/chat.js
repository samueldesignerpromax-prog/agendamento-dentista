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

// Armazenar sessões em memória
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
      
      // Recuperar ou criar sessão
      let session = sessions.get(sessionId);
      if (!session) {
        session = {
          step: 'greeting',
          data: {}
        };
        sessions.set(sessionId, session);
      }
      
      let response = {};
      
      // Processar baseado no step atual
      switch(session.step) {
        case 'greeting':
          response = {
            message: "Olá! 👋 Bem-vindo à clínica odontológica Sorriso Perfeito.\n\nVamos agendar seu atendimento? Qual é o seu nome?",
            options: []
          };
          session.step = 'waiting_name';
          break;
          
        case 'waiting_name':
          if (!message || message.trim().length < 2) {
            response = {
              message: "Por favor, digite seu nome completo:",
              options: []
            };
          } else {
            session.data.nome = message.trim();
            response = {
              message: `Prazer em conhecê-lo, ${session.data.nome}! 🦷\n\nQual procedimento você gostaria de realizar?\n\n1 - Limpeza (R$120)\n2 - Clareamento (R$800)\n3 - Extração (R$300)\n4 - Ortodontia (R$100)\n\nDigite o número correspondente:`,
              options: [
                { text: "Limpeza (R$120)", value: "1" },
                { text: "Clareamento (R$800)", value: "2" },
                { text: "Extração (R$300)", value: "3" },
                { text: "Ortodontia (R$100)", value: "4" }
              ]
            };
            session.step = 'waiting_procedure';
          }
          break;
          
        case 'waiting_procedure':
          let procedure;
          if (message === '1') procedure = PROCEDIMENTOS[0];
          else if (message === '2') procedure = PROCEDIMENTOS[1];
          else if (message === '3') procedure = PROCEDIMENTOS[2];
          else if (message === '4') procedure = PROCEDIMENTOS[3];
          else {
            response = {
              message: "Opção inválida. Por favor, escolha uma opção de 1 a 4:",
              options: [
                { text: "Limpeza (R$120)", value: "1" },
                { text: "Clareamento (R$800)", value: "2" },
                { text: "Extração (R$300)", value: "3" },
                { text: "Ortodontia (R$100)", value: "4" }
              ]
            };
            break;
          }
          
          session.data.procedimento = procedure;
          response = {
            message: `Ótima escolha! ${procedure.nome} - R$ ${procedure.preco.toFixed(2)}\n\nQual data você gostaria de agendar? (Formato: DD/MM/AAAA)\n\n📅 Segunda a Sexta: 09h às 18h\n📅 Sábado: 09h às 13h\n❌ Domingo: Fechado\n\nDigite a data (exemplo: 25/12/2024):`,
            options: []
          };
          session.step = 'waiting_date';
          break;
          
        case 'waiting_date':
          const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
          if (!dateRegex.test(message)) {
            response = {
              message: "Formato inválido! Por favor, digite a data no formato DD/MM/AAAA:\n\nExemplo: 25/12/2024",
              options: []
            };
            break;
          }
          
          const [day, month, year] = message.split('/');
          const date = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (date < today) {
            response = {
              message: "❌ Data inválida! Por favor, escolha uma data futura:\n\nDigite a data (DD/MM/AAAA):",
              options: []
            };
            break;
          }
          
          const availableHours = getAvailableHours(message);
          if (availableHours.length === 0) {
            response = {
              message: "❌ Desculpe, não atendemos aos domingos. Por favor, escolha uma data de segunda a sábado:\n\nDigite a data (DD/MM/AAAA):",
              options: []
            };
            break;
          }
          
          session.data.data = message;
          const hoursList = availableHours.join(', ');
          const timeOptions = availableHours.map(hour => ({ text: hour, value: hour }));
          
          response = {
            message: `📅 Data escolhida: ${message}\n\nHorários disponíveis:\n${hoursList}\n\nDigite o horário desejado:`,
            options: timeOptions
          };
          session.step = 'waiting_time';
          session.data.availableHours = availableHours;
          break;
          
        case 'waiting_time':
          if (!session.data.availableHours.includes(message)) {
            response = {
              message: `❌ Horário inválido! Horários disponíveis: ${session.data.availableHours.join(', ')}\n\nDigite um horário válido:`,
              options: session.data.availableHours.map(hour => ({ text: hour, value: hour }))
            };
            break;
          }
          
          session.data.horario = message;
          response = {
            message: `⏰ Horário escolhido: ${message}\n\n💰 Formas de pagamento:\n\n1 - PIX (10% desconto)\n2 - Cartão de crédito\n3 - Dinheiro\n\nDigite o número correspondente:`,
            options: [
              { text: "PIX (10% desconto)", value: "1" },
              { text: "Cartão de crédito", value: "2" },
              { text: "Dinheiro", value: "3" }
            ]
          };
          session.step = 'waiting_payment';
          break;
          
        case 'waiting_payment':
          let payment;
          if (message === '1') payment = PAGAMENTOS[0];
          else if (message === '2') payment = PAGAMENTOS[1];
          else if (message === '3') payment = PAGAMENTOS[2];
          else {
            response = {
              message: "Opção inválida! Escolha 1, 2 ou 3:",
              options: [
                { text: "PIX (10% desconto)", value: "1" },
                { text: "Cartão de crédito", value: "2" },
                { text: "Dinheiro", value: "3" }
              ]
            };
            break;
          }
          
          let valorFinal = session.data.procedimento.preco;
          let desconto = 0;
          
          if (payment.desconto > 0) {
            desconto = (session.data.procedimento.preco * payment.desconto) / 100;
            valorFinal = session.data.procedimento.preco - desconto;
          }
          
          session.data.pagamento = payment;
          session.data.valorFinal = valorFinal;
          session.data.desconto = desconto;
          
          let confirmMessage = `📋 CONFIRME SEUS DADOS:\n\n`;
          confirmMessage += `👤 Nome: ${session.data.nome}\n`;
          confirmMessage += `🦷 Procedimento: ${session.data.procedimento.nome}\n`;
          confirmMessage += `💰 Valor: R$ ${session.data.procedimento.preco.toFixed(2)}\n`;
          
          if (payment.desconto > 0) {
            confirmMessage += `🎉 Desconto: -R$ ${desconto.toFixed(2)}\n`;
            confirmMessage += `💵 Valor final: R$ ${valorFinal.toFixed(2)}\n`;
          }
          
          confirmMessage += `📅 Data: ${session.data.data}\n`;
          confirmMessage += `⏰ Horário: ${session.data.horario}\n`;
          confirmMessage += `💳 Pagamento: ${payment.nome}\n\n`;
          confirmMessage += `Deseja confirmar o agendamento?\n`;
          confirmMessage += `Digite 1 para SIM ou 2 para CANCELAR`;
          
          response = {
            message: confirmMessage,
            options: [
              { text: "✅ Sim, confirmar", value: "1" },
              { text: "❌ Cancelar", value: "2" }
            ]
          };
          session.step = 'waiting_confirm';
          break;
          
        case 'waiting_confirm':
          if (message === '1') {
            const appointment = {
              id: uuidv4(),
              nome: session.data.nome,
              procedimento: session.data.procedimento.nome,
              precoOriginal: session.data.procedimento.preco,
              desconto: session.data.desconto,
              valorFinal: session.data.valorFinal,
              data: session.data.data,
              horario: session.data.horario,
              pagamento: session.data.pagamento.nome,
              createdAt: new Date().toISOString()
            };
            
            // Salvar agendamento (aqui você pode salvar em um banco de dados)
            console.log('Agendamento salvo:', appointment);
            
            const finalMessage = `✅ AGENDAMENTO CONFIRMADO!\n\n👤 Nome: ${session.data.nome}\n🦷 Procedimento: ${session.data.procedimento.nome}\n💰 Valor: R$ ${session.data.valorFinal.toFixed(2)}\n📅 Data: ${session.data.data}\n⏰ Horário: ${session.data.horario}\n💳 Pagamento: ${session.data.pagamento.nome}\n\n📌 Entraremos em contato caso necessário.\n\nObrigado por escolher a clínica Sorriso Perfeito! 🦷✨\n\nDeseja fazer um novo agendamento? Digite "sim" para recomeçar.`;
            
            response = {
              message: finalMessage,
              options: [{ text: "🔄 Novo agendamento", value: "sim" }],
              appointment: appointment
            };
            session.step = 'finished';
          } else {
            // Cancelar e recomeçar
            session.step = 'greeting';
            session.data = {};
            response = {
              message: "❌ Agendamento cancelado.\n\nDeseja recomeçar? Digite 'sim' para iniciar um novo agendamento.",
              options: [{ text: "🔄 Recomeçar", value: "sim" }]
            };
          }
          break;
          
        case 'finished':
          if (message === 'sim') {
            session.step = 'greeting';
            session.data = {};
            response = {
              message: "Olá! 👋 Bem-vindo à clínica odontológica Sorriso Perfeito.\n\nVamos agendar seu atendimento? Qual é o seu nome?",
              options: []
            };
            session.step = 'waiting_name';
          } else {
            response = {
              message: "Obrigado pela preferência! Se precisar de algo, é só chamar. 👋",
              options: []
            };
          }
          break;
      }
      
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
