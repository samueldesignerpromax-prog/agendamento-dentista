// API Configuration
const API_URL = '/api';

// Generate unique session ID
function getSessionId() {
    let sessionId = localStorage.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chatSessionId', sessionId);
    }
    return sessionId;
}

let sessionId = getSessionId();
let isWaitingResponse = false;

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const quickOptions = document.getElementById('quickOptions');
const optionsContainer = document.getElementById('optionsContainer');

// Add message to chat
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-bubble">${formatMessage(text)}</div>
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// Format message with line breaks
function formatMessage(text) {
    return text.replace(/\n/g, '<br>');
}

// Show typing indicator
function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'message bot-message';
    indicatorDiv.id = 'typingIndicator';
    indicatorDiv.innerHTML = `
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(indicatorDiv);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show quick options
function showOptions(options) {
    if (!options || options.length === 0) {
        quickOptions.style.display = 'none';
        return;
    }
    
    optionsContainer.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option.text;
        button.onclick = () => {
            messageInput.value = option.value;
            sendMessage();
        };
        optionsContainer.appendChild(button);
    });
    
    quickOptions.style.display = 'block';
}

// Hide options
function hideOptions() {
    quickOptions.style.display = 'none';
}

// Send message to backend
async function sendMessage() {
    if (isWaitingResponse) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, true);
    messageInput.value = '';
    hideOptions();
    
    isWaitingResponse = true;
    showTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                sessionId: sessionId
            })
        });
        
        const data = await response.json();
        
        removeTypingIndicator();
        
        if (data.success) {
            addMessage(data.message);
            
            if (data.options && data.options.length > 0) {
                showOptions(data.options);
            } else {
                hideOptions();
            }
            
            // If appointment was created, show success animation
            if (data.appointment) {
                showSuccessAnimation();
            }
        } else {
            addMessage('Desculpe, ocorreu um erro. Por favor, tente novamente.');
        }
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage('Desculpe, não consegui me conectar ao servidor. Por favor, verifique sua conexão.');
    } finally {
        isWaitingResponse = false;
    }
}

// Show success animation
function showSuccessAnimation() {
    const successDiv = document.createElement('div');
    successDiv.style.position = 'fixed';
    successDiv.style.top = '50%';
    successDiv.style.left = '50%';
    successDiv.style.transform = 'translate(-50%, -50%)';
    successDiv.style.backgroundColor = '#48bb78';
    successDiv.style.color = 'white';
    successDiv.style.padding = '20px 40px';
    successDiv.style.borderRadius = '10px';
    successDiv.style.fontWeight = 'bold';
    successDiv.style.zIndex = '1000';
    successDiv.style.animation = 'fadeIn 0.3s ease';
    successDiv.innerHTML = '✅ Agendamento confirmado!';
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            successDiv.remove();
        }, 300);
    }, 3000);
}

// Handle enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isWaitingResponse) {
        sendMessage();
    }
});

sendButton.addEventListener('click', () => {
    if (!isWaitingResponse) {
        sendMessage();
    }
});

// Focus input on load
messageInput.focus();

// Add CSS animation for fadeOut
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
    }
`;
document.head.appendChild(style);

// Reset session (optional)
function resetSession() {
    localStorage.removeItem('chatSessionId');
    sessionId = getSessionId();
    location.reload();
}

// Add reset button to header
const headerContent = document.querySelector('.header-content');
if (headerContent) {
    const resetButton = document.createElement('button');
    resetButton.innerHTML = '🔄';
    resetButton.style.background = 'rgba(255,255,255,0.2)';
    resetButton.style.border = 'none';
    resetButton.style.color = 'white';
    resetButton.style.width = '36px';
    resetButton.style.height = '36px';
    resetButton.style.borderRadius = '50%';
    resetButton.style.cursor = 'pointer';
    resetButton.style.fontSize = '1.2rem';
    resetButton.title = 'Iniciar novo atendimento';
    resetButton.onclick = () => {
        if (confirm('Deseja iniciar um novo atendimento? Todo o progresso será perdido.')) {
            resetSession();
        }
    };
    
    headerContent.appendChild(resetButton);
}

// Console tips
console.log('🦷 Chatbot odontológico carregado!');
console.log('💡 Dica: Use as opções rápidas para facilitar o agendamento!');
