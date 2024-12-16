const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;


app.use(bodyParser.json());
app.use(express.static('www')); 

// Connessione al database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Database connesso"))
    .catch(err => console.error("Errore di connessione al database", err));


const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
});

const matchSchema = new mongoose.Schema({
    location: String,
    date: Date,
    time: String,
    mode: String,
    creator: String,
    participants: [{ 
        username: String, 
        roles: [String],
        posizione_campo: String // Nuovo attributo
    }],
    removedParticipants: [{ username: String }],
    chat: [{ username: String, message: String, timestamp: Date }] // Schema della chat
});

app.post('/matches/:id/updatePosition', async (req, res) => {
    const matchId = req.params.id;
    const { username, posizione_campo } = req.body;

    try {
        const match = await Match.findById(matchId);

        if (!match) {
            return res.status(404).send("Partita non trovata");
        }

        // Trova il partecipante
        const participant = match.participants.find(p => p.username === username);

        if (!participant) {
            return res.status(404).send("Partecipante non trovato");
        }

        // Aggiorna la posizione_campo
        participant.posizione_campo = posizione_campo;

        await match.save();

        res.status(200).send(`Posizione campo aggiornata per ${username}: ${posizione_campo}`);
    } catch (error) {
        console.error("Errore durante l'aggiornamento della posizione campo:", error);
        res.status(500).send("Errore durante l'aggiornamento della posizione campo");
    }
});

const User = mongoose.model('User', userSchema);
const Match = mongoose.model('Match', matchSchema);

// Validità token
app.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).send("Token non valido");
            }
            req.user = decoded;
            next();
        });
    } else {
        req.user = null;
        next();
    }
});

// Registrazione
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).send("Utente già registrato");
        }
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).send("Utente registrato");
    } catch (error) {
        res.status(400).send("Errore: " + error.message);
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send("Credenziali non valide");
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET);
    res.json({ token });
});

// Creazione di una partita
app.post('/matches', async (req, res) => {
    const { location, date, time, mode, creator } = req.body;
    const match = new Match({
        location,
        date,
        time,
        mode,
        creator,
        participants: [{ username: creator, roles: ['Creatore'] }],
        chat: [] 
    });

    await match.save();
    res.status(201).send("Partita creata");
});

// Unirsi a una partita
app.post('/matches/:id/join', async (req, res) => {
    const { roles, username } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) {
        return res.status(404).send("Partita non trovata");
    }

    
    const maxParticipants = {
        "5": 10,
        "7": 14,
        "11": 22
    };
    
    const currentParticipants = match.participants.length;
    const allowedParticipants = maxParticipants[match.mode];

    // Controlla se si è raggiunto il limite massimo per la modalità corrente
    if (allowedParticipants && currentParticipants >= allowedParticipants) {
        return res.status(400).send("Limite massimo di partecipanti raggiunto per questa modalità");
    }

    // Controlla se l'utente è già un partecipante
    if (match.participants.some(p => p.username === username)) {
        return res.status(400).send("Sei già unito a questa partita");
    }

    // Controlla se l'utente è stato rimosso
    if (match.removedParticipants.some(rp => rp.username.trim() === username)) {
        return res.status(403).send("Non puoi unirti a questa partita perché sei stato rimosso.");
    }

    match.participants.push({ username, roles });
    await match.save();

    res.send("Sei unito alla partita!");
});

// Visualizzazione delle partite
app.get('/matches', async (req, res) => {
    const matches = await Match.find();
    res.json(matches);
});

// Rimuovi un partecipante dalla partita
app.post('/matches/:id/remove', async (req, res) => {
    const matchId = req.params.id;
    const { username } = req.body;
    console.log("username: ", username);
    const match = await Match.findById(matchId);

    if (!match) {
        return res.status(404).send("Partita non trovata");
    }

    // Rimuovi il partecipante e aggiungilo alla lista dei rimossi
    match.participants = match.participants.filter(participant => participant.username !== username.trim());
    match.removedParticipants.push({ username });
    await match.save();

    res.json(match.participants);
});

// Cancellare una partita
app.delete('/matches/:id', async (req, res) => {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);

    if (!match) {
        return res.status(404).send("Partita non trovata");
    }

    await Match.deleteOne({ _id: matchId });
    res.send("Partita cancellata");
});
// Abbandonare una partita
app.post('/matches/:id/leave', async (req, res) => {
    const matchId = req.params.id;
    const { username } = req.user; 

    try {
        const match = await Match.findById(matchId);

        if (!match) {
            return res.status(404).send("Partita non trovata");
        }

        // Controlla se l'utente è un partecipante
        const isParticipant = match.participants.some(p => p.username === username);
        if (!isParticipant) {
            return res.status(400).send("Non sei un partecipante a questa partita");
        }

        // Rimuovi l'utente dai partecipanti
        match.participants = match.participants.filter(p => p.username !== username);
        await match.save();

        res.status(200).send("Hai abbandonato la partita con successo");
    } catch (error) {
        console.error("Errore durante l'abbandono della partita:", error);
        res.status(500).send("Errore durante l'abbandono della partita");
    }
});
const server = http.createServer(app);
const io = socketIo(server);
io.on('connection', (socket) => {
    console.log('Un utente si è connesso');

    socket.on('joinMatch', (matchId) => {
        socket.join(matchId);
        console.log(`Utente si è unito alla partita: ${matchId}`);

        Match.findById(matchId).then((match) => {
            if (match) {
                socket.emit('chatHistory', match.chat); 
            }
        });
    });

    // Invia un messaggio nella chat
    socket.on('sendChatMessage', async ({ matchId, username, message }) => {
        const match = await Match.findById(matchId);
        console.log("matchId message: ", matchId);
        if (!match) {
            return;
        }
        console.log(`Messaggio di chat da ${username} nella partita ${matchId}: ${message}`);

        const chatMessage = { matchId ,username, message, timestamp: new Date() };
        match.chat.push(chatMessage);
        await match.save();

        io.to(matchId).emit('chatMessage', chatMessage);
    });

    // Aggiorna la posizione del cerchio
    socket.on('updateCirclePosition', (data) => {
        const { matchId, username, left, top } = data;       
        socket.to(matchId).emit('circlePositionUpdate', { matchId,username, left, top });
    });

    // Gestione della disconnessione
    socket.on('disconnect', () => {
        console.log('Un utente si è disconnesso');
    });
});

// Avvio del server
server.listen(port, () => {
    console.log(`Server in esecuzione su http://localhost:${port}`);
});