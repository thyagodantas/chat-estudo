let GEMINI_API_KEY = '';
let GEMINI_API_URL = '';

// Elementos do DOM
const chatHistory = document.getElementById('chat-history');
const userMessageInput = document.getElementById('user-message');
const sendMessageBtn = document.getElementById('send-message');
const newChatBtn = document.getElementById('new-chat-btn');
const deleteChatBtn = document.getElementById('delete-chat-btn');
const exportChatBtn = document.getElementById('export-chat-btn');
const renameChatBtn = document.getElementById('rename-chat-btn');
const settingsBtn = document.getElementById('settings-btn');
const chatList = document.getElementById('chat-list');
const currentChatTitle = document.getElementById('current-chat-title');

// Modals
const renameModal = document.getElementById('rename-modal');
const settingsModal = document.getElementById('settings-modal');
const newChatNameInput = document.getElementById('new-chat-name');
const confirmRenameBtn = document.getElementById('confirm-rename');
const cancelRenameBtn = document.getElementById('cancel-rename');
const saveSettingsBtn = document.getElementById('save-settings');
const cancelSettingsBtn = document.getElementById('cancel-settings');
const apiKeyInput = document.getElementById('api-key-input');

// Variáveis globais
let chats = [];
let currentChatId = null;
let currentChatName = '';

function exportChat() {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || chat.messages.length === 0) {
        alert('Nenhuma conversa para exportar');
        return;
    }
    
    let exportText = `Histórico de Conversa - ${chat.name}\n\n`;
    exportText += `Criado em: ${new Date(chat.createdAt).toLocaleString()}\n`;
    exportText += `Última atualização: ${new Date(chat.updatedAt).toLocaleString()}\n\n`;
    
    chat.messages.forEach(msg => {
        const date = new Date(msg.timestamp);
        exportText += `${msg.role === 'user' ? 'Você' : 'Assistente'} (${date.toLocaleString()}):\n`;
        exportText += `${msg.content}\n\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversa-${chat.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}

// Variáveis globais
let conversationHistory = [];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadChats();
    setupEventListeners();
    
    if (chats.length === 0) {
        createNewChat();
    } else {
        loadChat(chats[0].id);
    }
});

// Configura os event listeners
function setupEventListeners() {
    sendMessageBtn.addEventListener('click', sendUserMessage);
    newChatBtn.addEventListener('click', createNewChat);
    deleteChatBtn.addEventListener('click', deleteCurrentChat);
    exportChatBtn.addEventListener('click', exportChat);
    renameChatBtn.addEventListener('click', () => {
        showRenameModal(currentChatName);
    });
    settingsBtn.addEventListener('click', showSettingsModal);
    
    userMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage();
        }
    });
    
    // Modal events
    confirmRenameBtn.addEventListener('click', renameCurrentChat);
    cancelRenameBtn.addEventListener('click', hideRenameModal);
    saveSettingsBtn.addEventListener('click', saveSettings);
    cancelSettingsBtn.addEventListener('click', hideSettingsModal);
}

// Chat management functions
function createNewChat() {
    const newChat = {
        id: Date.now().toString(),
        name: `Conversa ${chats.length + 1}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    chats.unshift(newChat);
    saveChats();
    renderChatList();
    loadChat(newChat.id);
}

function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChatId = chatId;
    currentChatTitle.textContent = chat.name;
    currentChatName = chat.name;
    
    // Highlight active chat in sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.toggle('active', item.dataset.chatId === chatId);
    });
    
    // Render messages
    chatHistory.innerHTML = '';
    
    if (chat.messages.length === 0) {
        chatHistory.innerHTML = `
            <div class="welcome-message">
                <h2>Bem-vindo ao Assistente de Estudo Inteligente</h2>
                <p>Digite um tópico que deseja estudar e eu irei gerar um material personalizado para você!</p>
            </div>
        `;
    } else {
        chat.messages.forEach(msg => {
            addMessageToChat(msg.role, msg.content, true);
        });
    }
}

function deleteCurrentChat() {
    if (!currentChatId) return;
    
    if (confirm('Tem certeza que deseja excluir esta conversa? Isso não pode ser desfeito.')) {
        chats = chats.filter(chat => chat.id !== currentChatId);
        saveChats();
        
        if (chats.length > 0) {
            loadChat(chats[0].id);
        } else {
            createNewChat();
        }
    }
}

function renameCurrentChat() {
    const newName = newChatNameInput.value.trim();
    if (!newName) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.name = newName;
        chat.updatedAt = new Date().toISOString();
        saveChats();
        currentChatTitle.textContent = newName;
        renderChatList();
    }
    
    hideRenameModal();
}


function checkApiKey() {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (!savedApiKey || savedApiKey === '') {
        showApiKeyModal();
    } else {
        GEMINI_API_KEY = savedApiKey;
        GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    }
}

function showApiKeyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Configuração da API</h2>
            <p>Para usar este aplicativo, você precisa fornecer sua chave API do Gemini.</p>
            <div class="input-group">
                <input type="password" id="api-key-input" placeholder="Digite sua chave API">
            </div>
            <div class="modal-buttons">
                <button id="save-api-key-btn" class="btn btn-primary">Salvar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const saveBtn = document.getElementById('save-api-key-btn');
    saveBtn.addEventListener('click', () => {
        const apiKey = document.getElementById('api-key-input').value.trim();
        if (!apiKey) {
            alert('Por favor, digite uma chave API válida');
            return;
        }
        
        localStorage.setItem('geminiApiKey', apiKey);
        GEMINI_API_KEY = apiKey;
        GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        document.body.removeChild(modal);
        
        testApiKey(apiKey);
    });
}

async function testApiKey(apiKey) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Teste de conexão. Responda apenas com 'OK' se esta chave API for válida."
                    }],
                }],
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Chave API inválida');
        }

        console.log('API Key testada com sucesso');
    } catch (error) {
        console.error('Erro ao testar API Key:', error);
        alert(`A chave API fornecida parece ser inválida: ${error.message}`);
        showApiKeyModal();
    }
}
// Message functions
async function sendUserMessage() {
    const message = userMessageInput.value.trim();
    if (!message || !currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    
    // Add user message to chat
    const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    };
    
    chat.messages.push(userMessage);
    chat.updatedAt = new Date().toISOString();
    saveChats();
    
    addMessageToChat('user', message);
    userMessageInput.value = '';
    
    // Show loading indicator
    const loadingId = showLoadingIndicator();
    
    try {
        // Call Gemini API
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: prepareConversationHistory(chat.messages)
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Erro ao gerar resposta');
        }
        
        // Process AI response
        const aiResponse = data.candidates[0].content.parts[0].text;
        const aiMessage = {
            role: 'ai',
            content: aiResponse,
            timestamp: new Date().toISOString()
        };
        
        chat.messages.push(aiMessage);
        chat.updatedAt = new Date().toISOString();
        saveChats();
        
        addMessageToChat('ai', aiResponse);
    } catch (error) {
        console.error('Erro:', error);
        const errorMessage = `Desculpe, ocorreu um erro: ${error.message}`;
        addMessageToChat('ai', errorMessage);
        
        chat.messages.push({
            role: 'ai',
            content: errorMessage,
            timestamp: new Date().toISOString()
        });
        saveChats();
    } finally {
        removeLoadingIndicator(loadingId);
    }
}

function prepareConversationHistory(messages) {
    if (messages.length === 1) {
        return [{
            parts: [{
                text: `Atue como um tutor especialista no assunto solicitado. 
                Forneça um material de estudo completo sobre: ${messages[0].content}.
                Inclua:
                1. Uma introdução clara ao tópico
                2. Os conceitos fundamentais
                3. Exemplos práticos
                4. Aplicações no mundo real
                5. Curiosidades relevantes
                6. Sugestões de aprofundamento
                
                Seja detalhado, mas mantenha uma linguagem acessível. Formate a resposta com títulos e parágrafos claros.`
            }]
        }];
    }
    
    return messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{
            text: msg.content
        }]
    }));
}

function renderChatList() {
    chatList.innerHTML = '';
    
    chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.dataset.chatId = chat.id;
        
        chatItem.innerHTML = `
            <div class="chat-item-name">${chat.name}</div>
            <div class="chat-item-actions">
                <button class="edit-chat" title="Renomear"><i class="fas fa-edit"></i></button>
            </div>
        `;
        
        chatItem.addEventListener('click', () => loadChat(chat.id));
        
        const editBtn = chatItem.querySelector('.edit-chat');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentChatId = chat.id;
            showRenameModal(chat.name);
        });
        
        chatList.appendChild(chatItem);
    });
}

function addMessageToChat(role, content, skipTyping = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${role}-message`;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Aplica a formatação (negrito e título)
    let formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<h3>$1</h3>')
        .replace(/\n{2,}/g, '</p><p>') // múltiplas quebras viram novo parágrafo
        .replace(/\n/g, '<br>');       // quebra simples vira <br>
    formattedContent = '<p>' + formattedContent + '</p>'; // envolve tudo em <p>


    // Se for para pular a digitação ou a mensagem for do usuário
    if (skipTyping || role === 'user') {
        messageDiv.innerHTML = formattedContent;
        return messageDiv;
    }

    // Converte o conteúdo HTML para nós reais
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = formattedContent;
    const nodes = Array.from(tempContainer.childNodes);

    // Digitação realista preservando a estrutura HTML
    let nodeIndex = 0;
    let charIndex = 0;
    const typingSpeed = 5;

    function typeNext() {
        if (nodeIndex >= nodes.length) return;

        let currentNode = nodes[nodeIndex];

        // Se for um nó de texto
        if (currentNode.nodeType === Node.TEXT_NODE) {
            if (charIndex < currentNode.textContent.length) {
                messageDiv.appendChild(document.createTextNode(currentNode.textContent.charAt(charIndex)));
                charIndex++;
                setTimeout(typeNext, typingSpeed);
            } else {
                charIndex = 0;
                nodeIndex++;
                setTimeout(typeNext, typingSpeed);
            }
        }

        // Se for um elemento (ex: <strong>, <h3>)
        else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const clone = currentNode.cloneNode(false); // Cria o elemento vazio
            messageDiv.appendChild(clone);

            // Digita o conteúdo interno desse elemento
            const innerText = currentNode.textContent;
            let innerIndex = 0;

            function typeInsideElement() {
                if (innerIndex < innerText.length) {
                    clone.appendChild(document.createTextNode(innerText.charAt(innerIndex)));
                    innerIndex++;
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                    setTimeout(typeInsideElement, typingSpeed);
                } else {
                    nodeIndex++;
                    setTimeout(typeNext, typingSpeed);
                }
            }

            typeInsideElement();
        }

        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    typeNext();
    return messageDiv;
}

function showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai-message';
    loadingDiv.id = 'loading-indicator';
    loadingDiv.innerHTML = '<div class="loading"></div> Gerando material de estudo...';
    
    chatHistory.appendChild(loadingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    return 'loading-indicator';
}

function removeLoadingIndicator(id) {
    const loadingElement = document.getElementById(id);
    if (loadingElement) {
        loadingElement.remove();
    }
}

function startNewChat() {
    if (conversationHistory.length > 0) {
        if (confirm('Deseja iniciar uma nova conversa? O histórico atual será perdido.')) {
            clearChat();
        }
    }
}

function clearChat() {
    if (confirm('Tem certeza que deseja limpar toda a conversa? Isso não pode ser desfeito.')) {
        conversationHistory = [];
        localStorage.removeItem('currentConversation');
        renderConversationHistory();
    }
}

// Funções para gerenciar o armazenamento local
function saveConversation() {
    localStorage.setItem('currentConversation', JSON.stringify(conversationHistory));
}

function loadConversation() {
    const savedConversation = localStorage.getItem('currentConversation');
    if (savedConversation) {
        conversationHistory = JSON.parse(savedConversation);
        renderConversationHistory();
    }
}

function renderConversationHistory() {
    chatHistory.innerHTML = '';

    if (conversationHistory.length === 0) {
        chatHistory.innerHTML = `
            <div class="welcome-message">
                <h2>Bem-vindo ao Assistente de Estudo Inteligente</h2>
                <p>Digite um tópico que deseja estudar e eu irei gerar um material personalizado para você!</p>
            </div>
        `;
        return;
    }

    conversationHistory.forEach(msg => {
        addMessageToChat(msg.role, msg.content, true); // Pula efeito de digitação
    });
}


function showRenameModal(currentName = '') {
    newChatNameInput.value = currentName;
    renameModal.style.display = 'flex';
}

function hideRenameModal() {
    renameModal.style.display = 'none';
}

function showSettingsModal() {
    apiKeyInput.value = GEMINI_API_KEY || '';
    settingsModal.style.display = 'flex';
}

function hideSettingsModal() {
    settingsModal.style.display = 'none';
}

function loadSettings() {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
        GEMINI_API_KEY = savedApiKey;
        GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    }
}

function saveSettings() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('Por favor, digite uma chave API válida');
        return;
    }
    
    localStorage.setItem('geminiApiKey', apiKey);
    GEMINI_API_KEY = apiKey;
    GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    hideSettingsModal();
    testApiKey(apiKey);
}

function loadChats() {
    const savedChats = localStorage.getItem('chatSessions');
    if (savedChats) {
        chats = JSON.parse(savedChats);
        renderChatList(); // Adicione esta linha para renderizar a lista após carregar
    }
}

function saveChats() {
    localStorage.setItem('chatSessions', JSON.stringify(chats));
    renderChatList();
}
