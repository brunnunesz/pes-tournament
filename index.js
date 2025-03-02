require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// O multer é responsável por receber uploads de arquivos (ex.: logo do time)
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 3000;

// Arrays em memória para armazenar os dados (exemplo simples; ideal seria usar banco)
let campeonatos = [];
let times = [];

// Rotas separadas
const championshipRoutes = require('./src/routes/championship.routes.js');

// Middlewares
app.use(cors());
app.use(express.json());

// Servir a pasta "uploads" para acessar as imagens enviadas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir pasta public (onde ficará front-end)
app.use(express.static('public'));

// Usar as rotas do championship
app.use('/campeonato', championshipRoutes);

/**
 * Rotas de TIMES (agora com upload de arquivo)
 */
app.get('/times', (req, res) => {
    res.json(times);
});

app.post('/times', upload.single('logoFile'), (req, res) => {
    // Recebemos "nome" via req.body e o arquivo via req.file
    const { nome } = req.body;
    if (!nome) {
        return res.status(400).json({ mensagem: 'Nome do time é obrigatório' });
    }

    // Se tiver arquivo, armazenamos o nome gerado pelo multer em "logo"
    let logoFilename = '';
    if (req.file) {
        logoFilename = req.file.filename;
    }

    const novoTime = {
        id: times.length + 1,
        nome,
        // Em "logo", guardamos o nome do arquivo dentro da pasta "uploads"
        logo: logoFilename
    };

    times.push(novoTime);
    return res.status(201).json(novoTime);
});

/**
 * Inicia o servidor
 */
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
