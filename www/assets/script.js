let token;
let username;
let actMatchId;
let captains = {}; 

// Funzione per mostrare la schermata di login
function showAuthForm() {
    document.getElementById('auth-form').style.display = 'block';
    document.getElementById('match-form').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('field').style.display = 'none';
    document.getElementById('container-register').style.display = 'flex';  
    document.getElementById('menu_elem').style.display = 'none';
}

// Funzione per mostrare la schermata di partite
function showMatchForm() {
    document.getElementById('menu_elem').style.display = 'flex';
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('match-form').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';
    loadMatches();  
}

// Funzione per mostrare la schermata del campo
let socket;
async function showGameScreen(match) {
    actMatchId = match._id;
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('match-form').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('field').style.display = 'block';

    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = ''; 
    
    // Rimuovi cerchi esistenti
    const existingCircles = document.querySelectorAll('.participant-circle');
    existingCircles.forEach(circle => circle.remove());

    // Recupera i capitani dal localStorage
    if (!captains[match._id]) {
        const savedCaptains = localStorage.getItem(`captains_${match._id}`);
        captains[match._id] = savedCaptains ? JSON.parse(savedCaptains) : [];
    }

    // Determina se l'utente attuale è uno dei capitani
    console.log(captains[match._id]);
    
    let isUserCaptain = captains[match._id][0]?.includes(username);
    for (let i = 1; i < captains[match._id].length; i++) {
        isUserCaptain = captains[match._id][i]?.includes(username) || isUserCaptain;
        if(isUserCaptain) break;
    }
    const roleColors = {
        attaccante: 'red',
        centrocampista: 'orange',
        difensore: 'green',
        portiere: 'yellow',
    };
    // Mostra i partecipanti e crea cerchi
    match.participants.forEach(participant => {
        const li = document.createElement('li');
        const isCaptain = captains[match._id]?.includes(participant.username);
        const role = participant.username === match.creator 
            ? 'Creatore' 
            : participant.roles.join(', ');

        li.innerHTML = `
            ${participant.username} - Ruoli: ${role} ${
            isCaptain ? '<span style="color: blue; font-weight: bold;">(Capitano)</span>' : ''
        }`;

        // Creazione del div container comune
        const containerDiv = document.createElement('div');
        containerDiv.className = 'action-container';
        containerDiv.style.display = 'flex';
        containerDiv.style.gap = '10px'; // Spaziatura tra gli elementi (opzionale)

        // Primo if per il bottone "Abbandona Partita"
        if (participant.username !== match.creator && participant.username === username) {
            const leaveButton = document.createElement('button');
            leaveButton.textContent = 'Abbandona Partita';
            leaveButton.className = 'leave-button';
            leaveButton.addEventListener('click', () => showLeaveConfirmationModal(match._id));
            containerDiv.appendChild(leaveButton);
        }

        // Secondo if per la select del ruolo
        if (participant.username === username) {
            const roleSelect = document.createElement('select');
            roleSelect.className = 'role-select';
        
            // Placeholder "Ruolo"
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Ruolo'; 
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            roleSelect.appendChild(placeholderOption);
        
            // Opzioni disponibili e mappatura dei colori
            const roles = ['Attaccante', 'Centrocampista', 'Difensore', 'Portiere'];
            
        
            // Popola la select con le opzioni
            roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.toLowerCase(); 
                option.textContent = role; 
                roleSelect.appendChild(option);
            });
        
            // Imposta il ruolo e il colore se già settato
            if (participant.posizione_campo) {
                let currentRole = participant.posizione_campo.toLowerCase(); 
                if (roleColors[currentRole]) {
                    // Colora il cerchio
                    const participantCircle = document.getElementById(participant.username);
                    if (participantCircle) {
                        participantCircle.style.backgroundColor = roleColors[currentRole];
                    }
        
                    // Seleziona il ruolo nella select
                    roleSelect.value = currentRole;
                }
            }
        
            // Event listener per il cambio del ruolo
            roleSelect.addEventListener('change', async (event) => {
                const selectedRole = event.target.value;
        
                // Cambia il colore del cerchio in base al ruolo selezionato
                const participantCircle = document.getElementById(participant.username);
                if (participantCircle && roleColors[selectedRole]) {
                    participantCircle.style.backgroundColor = roleColors[selectedRole];
                }
        
                
                try {
                    const response = await fetch(`/matches/${match._id}/updatePosition`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({
                            username: participant.username,
                            posizione_campo: selectedRole
                        })
                    });
        
                    if (!response.ok) {
                        console.error("Errore durante l'aggiornamento della posizione:", await response.text());
                    } else {
                        console.log(`Ruolo aggiornato per ${participant.username}: ${selectedRole}`);
                    }
                } catch (error) {
                    console.error("Errore nella richiesta:", error);
                }
            });
        
            containerDiv.appendChild(roleSelect);
        }

        // Aggiunta del container al list item (li) solo se contiene elementi
        if (containerDiv.children.length > 0) {
            li.appendChild(containerDiv);
        }
                

        participantsList.appendChild(li);

        // Crea il cerchio per il partecipante
        const participantCircle = document.createElement('div');
        participantCircle.className = 'participant-circle'; 
        participantCircle.textContent = participant.username; 
        participantCircle.id = participant.username; 
        participantCircle.style.position = 'absolute'; 
        if (participant.posizione_campo) {
            let currentRole = participant.posizione_campo.toLowerCase(); 
            participantCircle.style.backgroundColor = roleColors[currentRole];
        }
        
        // Recupera la posizione salvata dal localStorage
        const savedPosition = localStorage.getItem(`circlePosition_${participant.username}`);
        if (savedPosition) {
            const { left, top } = JSON.parse(savedPosition);
            participantCircle.style.left = `${left}px`;
            participantCircle.style.top = `${top}px`;
        } else {
            // Posizione casuale se non c'è posizione salvata
            participantCircle.style.left = `${Math.random() * (document.getElementById('field').clientWidth - 50)}px`;
            participantCircle.style.top = `${Math.random() * (document.getElementById('field').clientHeight - 50)}px`;
        }

        document.getElementById('field').appendChild(participantCircle);

        // Abilita lo spostamento solo per i capitani
        if (isUserCaptain) {
            enableDragging(participantCircle, participant.username, match); 
        } else {
            participantCircle.style.cursor = 'default'; 
        }
    });

    // Creatore ha i pulsanti per rimuovere e cancellare la partita
    if (match.creator === username) {
        addCreatorButtons(match, match._id);
    }
    setupChat(match.chat);
}
// Funzione per il drag del cerchio
function enableDragging(circle, username, match) {
    circle.style.cursor = 'grab'; 
    circle.addEventListener('mousedown', (e) => {
        e.preventDefault(); 

        let offsetX = e.clientX - circle.getBoundingClientRect().left;
        let offsetY = e.clientY - circle.getBoundingClientRect().top;

        const moveCircle = (event) => {
            // Calcola la nuova posizione del cerchio
            const fieldRect = document.getElementById('field').getBoundingClientRect();
            let newX = event.clientX - offsetX - fieldRect.left;
            let newY = event.clientY - offsetY - fieldRect.top;

            // Limita il cerchio all'interno del campo
            newX = Math.max(0, Math.min(newX, fieldRect.width - circle.clientWidth));
            newY = Math.max(0, Math.min(newY, fieldRect.height - circle.clientHeight));

            circle.style.left = `${newX}px`;
            circle.style.top = `${newY}px`;

            socket.emit('updateCirclePosition', { matchId: match._id, username, left: newX, top: newY });

            // Salva la posizione nel localStorage
            localStorage.setItem(`circlePosition_${username}`, JSON.stringify({ left: newX, top: newY }));
        };

        const stopMoveCircle = () => {
            document.removeEventListener('mousemove', moveCircle);
            document.removeEventListener('mouseup', stopMoveCircle);
        };

        document.addEventListener('mousemove', moveCircle);
        document.addEventListener('mouseup', stopMoveCircle);
    });
}
// Funzione per aggiungere i pulsanti per il creatore
function addCreatorButtons(match, matchId) {
    const buttonCont = document.getElementById('bottoni_edit');
    buttonCont.innerHTML = ''; 

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Rimuovi Partecipante';
    removeButton.addEventListener('click', () => {
        showRemoveParticipantModal(matchId);
    });
    buttonCont.appendChild(removeButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Cancella Partita';
    deleteButton.addEventListener('click', () => {
        showDeleteConfirmationModal(matchId);
    });
    buttonCont.appendChild(deleteButton);

    const setCaptainButton = document.createElement('button');
    setCaptainButton.textContent = 'Imposta Capitani';
    setCaptainButton.addEventListener('click', () => {
        showCaptainSelectionModal(match,matchId);
    });
    buttonCont.appendChild(setCaptainButton);
}

function showDeleteConfirmationModal(matchId) {
    const modal = document.createElement('div');
    modal.className = 'modal';  
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Sei sicuro di voler cancellare questa partita?</h2>
            <button id="confirm-delete" class="confirm-btn">Sì</button>
            <button id="cancel-delete" class="cancel-btn">No</button>
        </div>
    `;

    // Mostra la modale
    document.body.appendChild(modal);

    // Conferma la cancellazione della partita
    document.getElementById('confirm-delete').addEventListener('click', () => {
        deleteMatch(matchId);
        modal.remove(); // Rimuovi la modale di conferma
    });

    // Cancella e chiudi la modale senza fare nulla
    document.getElementById('cancel-delete').addEventListener('click', () => {
        modal.remove(); // Rimuovi la modale di conferma
    });
}
function showRemoveParticipantModal(matchId) {
    const modal = document.createElement('div');
    modal.className = 'modal';  
    const participants = document.getElementById('participants-list').children;
    // Crea la lista dei partecipanti con la "X" accanto
    const participantListHTML = Array.from(participants).map(li => {
        const username = li.textContent.split(' - ')[0];  // Estrai il nome utente
        return `<li class="participant-item">
                    <span>${username}</span> 
                    <button class="remove-btn" data-username="${username}">Rimuovi</button>
                </li>`;
    }).join('');
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Seleziona un partecipante da rimuovere</h2>
            <ul class="participant-list">${participantListHTML}</ul>
            <button id="close-modal" class="close-btn">Chiudi</button>
        </div>
    `;

    // Mostra la modale
    document.body.appendChild(modal);

    // Aggiungi evento per ciascun bottone "Rimuovi"
    modal.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const participantUsername = event.target.dataset.username;
            showConfirmationModal(matchId, participantUsername); // Mostra la nuova modale di conferma
        });
    });

    // Chiudi la modale
    document.getElementById('close-modal').addEventListener('click', () => {
        modal.remove();  // Rimuovi la modale dal DOM
    });
}

// Funzione per mostrare la modale di conferma
function showConfirmationModal(matchId, participantUsername) {
    const modal = document.createElement('div');
    modal.className = 'modal';  // Aggiungi una classe per stilizzare la modale
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Sei sicuro di voler rimuovere ${participantUsername}?</h2>
            <button id="confirm-remove" class="confirm-btn">Sì</button>
            <button id="cancel-remove" class="cancel-btn">No</button>
        </div>
    `;

    // Mostra la modale
    document.body.appendChild(modal);

    // Conferma la rimozione del partecipante
    document.getElementById('confirm-remove').addEventListener('click', () => {
        removeParticipant(matchId, participantUsername);
        modal.remove(); // Rimuovi la modale di conferma
    });

    // Cancella e chiudi la modale senza fare nulla
    document.getElementById('cancel-remove').addEventListener('click', () => {
        modal.remove(); // Rimuovi la modale di conferma
    });
}

// Funzione per rimuovere partecipante
async function removeParticipant(matchId, participantUsername) {
    // Controlla se l'utente sta cercando di rimuovere se stesso
    if (participantUsername.trim() === username) {
        
        alert("Non puoi rimuovere te stesso dalla partita.");
        return; 
    }

    try {
        const response = await fetch(`/matches/${matchId}/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username: participantUsername })
        });

        if (response.ok) {
            // Rimuovi il partecipante dalla lista dell'interfaccia utente
            const participantsList = document.getElementById('participants-list');
            const participantElement = [...participantsList.children].find(li => li.textContent.startsWith(participantUsername));
            if (participantElement) {
                participantsList.removeChild(participantElement);
            }
        } else {
            alert("Errore durante la rimozione del partecipante");
        }
    } catch (error) {
        console.error("Errore durante la rimozione del partecipante:", error);
    }
}
function showCaptainSelectionModal(match,matchId) {
    const modal = document.createElement('div');
    modal.className = 'modal';

    const participants = document.getElementById('participants-list').children;

    // Costruisce la lista dei partecipanti
    const participantListHTML = Array.from(participants).map(li => {
        const username = li.textContent.split(' - ')[0];
        const isCaptain = captains[matchId]?.includes(username);
        const activeClass = isCaptain ? 'active' : '';
        return `
            <li class="participant-item">
                <button 
                    class="captain-toggle ${activeClass}" 
                    data-username="${username}">
                    ${username} ${isCaptain ? '(Capitano)' : ''}
                </button>
            </li>`;
    }).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <h2>Seleziona Capitani</h2>
            <ul class="participant-list">${participantListHTML}</ul>
            <button id="confirm-captains" class="confirm-btn">Conferma</button>
            <button id="close-modal" class="close-btn">Chiudi</button>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listener per i pulsanti di selezione/deselezione
    modal.querySelectorAll('.captain-toggle').forEach(button => {
        button.addEventListener('click', (event) => {
            const username = event.target.dataset.username;

            if (captains[matchId]?.includes(username)) {
                // Deseleziona il capitano se è già selezionato
                captains[matchId] = captains[matchId].filter(captain => captain !== username);
                button.classList.remove('active');
                event.target.textContent = username;
            } else if (captains[matchId].length < 2) {
                // Seleziona il capitano se non è già selezionato e c'è spazio
                if (!captains[matchId]) captains[matchId] = [];
                captains[matchId].push(username);
                button.classList.add('active');
                event.target.textContent = `${username} (Capitano)`;
            }

            // Salva i capitani nel localStorage
            localStorage.setItem(`captains_${matchId}`, JSON.stringify(captains[matchId]));

            // Aggiorna lo stato dei pulsanti
            modal.querySelectorAll('.captain-toggle').forEach(btn => {
                const btnUsername = btn.dataset.username;
                if (!captains[matchId].includes(btnUsername) && captains[matchId].length >= 2) {
                    btn.disabled = true;
                } else {
                    btn.disabled = false;
                }
            });
        });
    });

    // Conferma la selezione
    document.getElementById('confirm-captains').addEventListener('click', () => {
        modal.remove();
        showGameScreen({ ...match, participants: match.participants }); // Aggiorna lo schermo
    });

    // Chiude la modale senza modifiche
    document.getElementById('close-modal').addEventListener('click', () => {
        modal.remove();
    });
}
function showConfirmationModalForCaptains(matchId, selectedCaptains) {
    const modal = document.createElement('div');
    modal.className = 'modal';  
    
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Confermi i capitani selezionati?</h2>
            <p>${selectedCaptains.join(' e ')}</p>
            <button id="confirm-selection" class="confirm-btn">Sì</button>
            <button id="cancel-selection" class="cancel-btn">No</button>
        </div>
    `;

    // Mostra la modale
    document.body.appendChild(modal);

    // Conferma la selezione
    document.getElementById('confirm-selection').addEventListener('click', () => {
        captains[matchId] = selectedCaptains; // Salva definitivamente i capitani
        alert(`Capitani confermati: ${selectedCaptains.join(' e ')}`);
        modal.remove(); // Chiudi la modale di conferma
    });

    // Cancella la selezione
    document.getElementById('cancel-selection').addEventListener('click', () => {
        alert("Selezione annullata.");
        modal.remove(); // Chiudi la modale di conferma
    });
}
function showLeaveConfirmationModal(matchId) {
    const modal = document.createElement('div');
    modal.className = 'modal';  

    modal.innerHTML = `
        <div class="modal-content">
            <h2>Sei sicuro di voler abbandonare la partita?</h2>
            <button id="confirm-leave" class="confirm-btn">Sì</button>
            <button id="cancel-leave" class="cancel-btn">No</button>
        </div>
    `;

    // Mostra la modale
    document.body.appendChild(modal);

    // Conferma l'abbandono della partita
    document.getElementById('confirm-leave').addEventListener('click', async () => {
        await leaveMatch(matchId);
        modal.remove(); // Rimuovi la modale di conferma
    });

    // Cancella e chiudi la modale senza fare nulla
    document.getElementById('cancel-leave').addEventListener('click', () => {
        modal.remove(); // Rimuovi la modale di conferma
    });
}
async function leaveMatch(matchId) {
    try {
        const response = await fetch(`/matches/${matchId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert("Hai abbandonato la partita.");
            // Ritorna alla schermata principale
            showMatchForm();
        } else {
            alert("Errore durante l'abbandono della partita.");
        }
    } catch (error) {
        console.error("Errore durante l'abbandono della partita:", error);
    }
}
// Funzione per configurare la chat
function setupChat(chat) {
    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');
    const sendChatButton = document.getElementById('send-chat');
    chatBox.innerHTML = ''; 
    chat.forEach(message => {
        const chatMessageElement = document.createElement('div');
        chatMessageElement.textContent = `${message.username}: ${message.message}`;
        chatBox.appendChild(chatMessageElement);
        chatBox.scrollTop = chatBox.scrollHeight; 
    });
    
    if (!socket) {
        socket = io(); 
        socket.on('connect', () => {
            console.log('Connesso al server Socket.IO');
        });

        socket.on('chatMessage', (chatMessage) => {
            console.log(actMatchId);
            console.log('Messaggio ricevuto:', chatMessage); 
            if(actMatchId != chatMessage.matchId){
                console.log('Messaggio non per questa partita');
                return;
            }
            const chatMessageElement = document.createElement('div');
            chatMessageElement.textContent = `${chatMessage.username}: ${chatMessage.message}`;
            chatBox.appendChild(chatMessageElement);
            chatBox.scrollTop = chatBox.scrollHeight; 
        });
        socket.on('circlePositionUpdate', (data) => {
            
            const participantCircle = document.getElementById(data.username);
            if (participantCircle) {
                participantCircle.style.left = `${data.left}px`;
                participantCircle.style.top = `${data.top}px`;
            }

        });

    }
    
    sendChatButton.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            console.log('matchId:', actMatchId); 
            console.log('Invio messaggio:', message); 
            socket.emit('sendChatMessage', { matchId: actMatchId, username, message }); 
            chatInput.value = ''; 
        }
    });

    // Unisciti alla partita
    socket.emit('joinMatch', actMatchId);
}
// Ritorna alla schermata delle partite

// Gestione della schermata di registrazione
document.getElementById('register-button').addEventListener('click', () => {
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
});

document.getElementById('back-to-login').addEventListener('click', () => {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-form').style.display = 'block';
});

// Gestione della registrazione
document.getElementById('register-form').querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;
     
    if(newUsername.length > 16){
        alert("Username troppo lungo");
        return;
    }
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, password: newPassword })
        });
        console.log(response);
        if(response.status === 409){
            alert("Username già in uso");
            return;
        }
        if (response.ok) {
            alert("Registrazione avvenuta con successo! Ora puoi effettuare il login.");
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('auth-form').style.display = 'block';
        } else {
            const errorMessage = await response.text();
            alert("Errore: " + errorMessage);
        }
    } catch (error) {
        console.error("Errore durante la registrazione:", error);
    }
});

// Logout
document.getElementById('logout-button').addEventListener('click', () => {
    token = null;
    username = null;
    window.localStorage.clear();
    window.location.reload();
});

// Gestione della creazione della partita
document.getElementById('create-match-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const location = document.getElementById('location').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const mode = document.getElementById('mode').value;

    try {
        const response = await fetch('/matches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                location,
                date,
                time,
                mode,
                creator: username,
                participants: [{ username, roles: ['Creatore'] }]
            })
        });

        if (response.ok) {
            loadMatches(); 
            document.getElementById ('create-match-form').reset();
        }
    } catch (error) {
        console.error("Errore durante la creazione della partita:", error);
    }
});

// Funzione per formattare la data
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('it-IT', options);
}

// Aggiungi la partita alla lista
function addMatchToList(match) {
    const matchesContainer = document.getElementById('matches');
    const matchDiv = document.createElement('div');
    matchDiv.classList.add('match');

    // Determina il numero massimo di partecipanti in base alla modalità
    let maxParticipants;
    switch (match.mode) {
        case "5":
            maxParticipants = 10; 
            break;
        case "7":
            maxParticipants = 14; 
            break;
        case "11":
            maxParticipants = 22;
            break;
        default:
            maxParticipants = 0; 
    }

    // Formatta la data e l'ora
    const formattedDate = formatDate(match.date);
    const formattedTime = match.time; 
    matchDiv.innerHTML = 
        `<strong>Luogo:</strong> ${match.location}<br>
        <strong>Data:</strong> ${formattedDate}<br>
        <strong>Ora:</strong> ${formattedTime}<br>
        <strong>Partecipanti:</strong> ${match.participants.length} / ${maxParticipants}<br>
        <strong>Creatore:</strong> ${match.creator}<br>
    `;

    // Se l'utente non è ancora un partecipante, mostra il pulsante per unirsi
    if (!match.participants.some(participant => participant.username === username)) {
        const token = localStorage.getItem('token');
            if(token){
            const joinButton = document.createElement('button');
            joinButton.id = match._id; 
            joinButton.textContent = 'Unisciti';
            joinButton.classList.add("button-v");
            joinButton.addEventListener('click', () => {
                
                joinMatch(match._id, ''); 
                
            });
            matchDiv.appendChild(joinButton);
        }
    } else {
        const token = localStorage.getItem('token');
        if (token) {
            const viewButton = document.createElement('button');
            viewButton.textContent = 'Visualizza';
            viewButton.classList.add("button-v");
            viewButton.id = match._id; 
            viewButton.addEventListener('click', () => showGameScreen(match)); 
            matchDiv.appendChild(viewButton);
        }
    }

    matchesContainer.appendChild(matchDiv);
}

// Carica le partite
async function loadMatches() {
    const matchesContainer = document.getElementById('matches');
    matchesContainer.innerHTML = ''; 
    try {
        const response = await fetch('/matches');
        const matches = await response.json();
        matches.forEach(addMatchToList);
    } catch (error) {
        console.error("Errore durante il caricamento delle partite:", error);
    }
}

// Unisciti alla partita
async function joinMatch(matchId, roles) {
    // Controlla se l'utente è stato rimosso dalla partita
    const isRemoved = await checkIfRemoved(matchId, username);
    if (isRemoved) {
        alert("Non puoi unirti a questa partita perché sei stato rimosso.");
        return; 
    }

    try {
        const response = await fetch(`/matches/${matchId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, roles })
        });

        if (response.ok) {
            loadMatches();
            showGameScreen(await response.json());
        } else {
            const errorMessage = await response.text();
            alert("Errore: " + errorMessage);
        }
    } catch (error) {
        console.error("Errore durante l'unione alla partita:", error);
    }
}
// Funzione per controllare se l'utente è stato rimosso
async function checkIfRemoved(matchId, username) {
    try {
        const response = await fetch(`/matches/${matchId}/participants`);
        const participants = await response.json();
        const removedParticipants = participants.filter(p => p.status === 'removed'); 
        return removedParticipants.some(participant => participant.username === username);
    } catch (error) {
        console.error("Errore durante il controllo dei partecipanti:", error);
        return false;
    }
}

// Cancella la partita
async function deleteMatch(matchId) {
    try {
        const response = await fetch(`/matches/${matchId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Elemento per il messaggio di successo
        const messageContainer = document.getElementById('message-container');
        
        if (response.ok) {
            // Mostra il messaggio di successo
            messageContainer.textContent = "Partita cancellata con successo!";
            messageContainer.style.color = "green"; // Colore verde per successo
            messageContainer.style.display = "block"; // Assicurati che il messaggio sia visibile

            // Chiama showMatchForm per tornare alla schermata principale
            showMatchForm();
            
            // Nascondi il messaggio dopo 3 secondi
            setTimeout(() => {
                messageContainer.style.display = "none";
            }, 3000);
        } else {
            const errorMessage = await response.text();
            console.error("Errore: " + errorMessage);
            messageContainer.textContent = "Errore durante la cancellazione della partita.";
            messageContainer.style.color = "red"; // Colore rosso per errore
            messageContainer.style.display = "block";
            
            // Nascondi il messaggio dopo 3 secondi
            setTimeout(() => {
                messageContainer.style.display = "none";
            }, 3000);
        }
    } catch (error) {
        console.error("Errore durante la cancellazione della partita:", error);
    }
}

// Gestione del login
document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        if (response.ok) {
            document.getElementById('create-match').style.display = 'block';
            const data = await response.json();
            token = data.token;
            localStorage.setItem('token', token);
            localStorage.setItem('username', usernameInput);
            const logoutButton = document.getElementById('logout-button');
            logoutButton.style.display = 'block';
            const loginButton = document.getElementById('login-button');
            loginButton.style.display = 'none';
            username = usernameInput;
            document.getElementById('act-username').style.display = 'block';
            document.getElementById('act-username').innerHTML = "Nome Utente: "+username; // Pulisci l'input
            document.getElementById('logout-button').style.display = 'block';
            showInitMatch();
        } else {
            const errorMessage = await response.text();
            alert("Errore: " + errorMessage);
        }
    } catch (error) {
        console.error("Errore durante il login:", error);
    }
});

token = localStorage.getItem('token');
username = localStorage.getItem('username');

function showInitMatch(){
    const matchForm = document.getElementById('container-match-form');
    const menuElements = document.getElementById('menu_elements');
    matchForm.style.display = 'none ';

    document.getElementById('act-username').innerHTML = "Nome Utente: "+username; // Pulisci l'input
    showMatchForm();
    menuElements.style.display = 'block';
    document.getElementById('container-register').style.display = 'none';  
}

function showAvailbleMatch(){
    const containermatchForm = document.getElementById('container-match-form');
    const matchesForm = document.getElementById('match-form');
    const matches = document.getElementById('matches');
    const gameScreen = document.getElementById('game-screen');
    const showCreateMatch = document.getElementById('match-avaible');
    showCreateMatch.style.display = 'block';
    containermatchForm.style.display = 'none ';
    matches.style.display = 'block';
    gameScreen.style.display = 'none';
    matchesForm.style.display = 'block';
}

function showCreateMatch(){
    const containermatchForm = document.getElementById('container-match-form');
    const matchesForm = document.getElementById('match-form');
    const matches = document.getElementById('matches');
    const gameScreen = document.getElementById('game-screen');
    const showCreateMatch = document.getElementById('match-avaible');
    showCreateMatch.style.display = 'none';
    matchesForm.style.display = 'block';
    containermatchForm.style.display = 'block';
    matches.style.display = 'none';
    gameScreen.style.display = 'none';
}

if(token){
    document.getElementById('logout-button').style.display = 'block';
    document.getElementById('create-match').style.display = 'block';
    showInitMatch();
}
else{
    document.getElementById('create-match').style.display = 'none';
    document.getElementById('login-button').style.display = 'block';
    document.getElementById('act-username').style.display = 'none';
    showInitMatch();
}
