# SoccerGameManager

**SoccerGameManager** è un'applicazione web progettata per facilitare la gestione di partite di calcio tra persone. L'app consente a un utente di creare partite, a cui altri giocatori possono unirsi, e di organizzare gli incontri in base a un luogo e a un orario stabilito. È uno strumento ideale per chi desidera organizzare partite informali con amici o con altri appassionati di calcio.

## Funzionalità principali

- **Creazione di partite**: Gli utenti possono creare nuove partite, specificando dettagli come il luogo, la data, e l'orario.
- **Unirsi alle partite**: Gli utenti possono visualizzare le partite disponibili e unirsi a quelle di loro interesse.
- **Chat integrata**: Ogni partita ha una chat interna dove i partecipanti possono comunicare tra loro, coordinare dettagli e discutere dell'incontro.
- **Gestione della partita**: Il creatore della partita può modificare i dettagli (ad esempio, chi saranno i capitani) e gestire la lista dei partecipanti in qualsiasi momento prima dell'incontro.

## Come funziona

1. **Registrazione e accesso**: Gli utenti devono registrarsi e accedere al sistema per creare o partecipare alle partite.
2. **Creazione partita**: Una volta effettuato l'accesso, è possibile creare una nuova partita inserendo i dettagli richiesti.
3. **Partecipazione alla partita**: Gli utenti possono esplorare le partite disponibili e unirsi a quelle che si adattano alle loro preferenze..

## Tecnologie utilizzate

- **Frontend**: HTML, CSS, JAVASCRIPT
- **Backend**: Node.js runtime JavaScript per il server, Socket.IO per comunicazioni bidirezionali in tempo reale.
- **Database**: MongoDB, Mongoose: utilizzato per interfacciarsi con MongoDB

## Installazione

1. Clona il repository:
   ```bash
   git clone https://github.com/UniCT-WebDevelopment/SoccerGameManager.git

2. Installa MongoDB
3. Installa le dipendenze
   ```bash
   npm install

## Avvio
Una volta installato tutto bisogna avviare il server
```bash
 node server.js
```
Adesso è possibile accedere all'app inserendo il seguente indirizzo http://localhost:3000.
