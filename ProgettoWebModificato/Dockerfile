# Usa l'immagine ufficiale di Node.js (ad esempio la versione 18)
FROM node:18

# Imposta la working directory dentro il container
WORKDIR /app

# Copia SOLO i file di dipendenze per sfruttare la cache Docker
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutto il resto del codice nel container
COPY . .

# Espone la porta usata dall'app (ad esempio 3000)
EXPOSE 3000

# Comando di avvio dell'applicazione
CMD ["npm", "start"]
# oppure (se non usi uno script npm start):
# CMD ["node", "server.js"]
