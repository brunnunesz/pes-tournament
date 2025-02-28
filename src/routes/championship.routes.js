const express = require('express');
const router = express.Router();

let campeonatos = [];

router.post('/criar', (req, res) => {
    const { nome, jogadores } = req.body;

    if (!nome || !jogadores || !Array.isArray(jogadores) || jogadores.length < 2) {
        return res.status(400).json({ mensagem: 'Nome do campeonato e ao menos dois jogadores são obrigatórios' });
    }

    const novoCampeonato = {
        id: campeonatos.length + 1,
        nome,
        jogadores: jogadores.map((jogador, index) => ({
            id: index + 1,
            nome: jogador,
            pontos: 0
        })),
        partidas: gerarPartidas(jogadores),
        fase: 'fase-de-grupos'
    };

    campeonatos.push(novoCampeonato);
    res.status(201).json(novoCampeonato);
});

router.post('/registrar-resultado', (req, res) => {
    const { idCampeonato, jogador1, jogador2, placar1, placar2 } = req.body;

    const campeonato = campeonatos.find(c => c.id === idCampeonato);
    if (!campeonato) {
        return res.status(404).json({ mensagem: 'Campeonato não encontrado' });
    }

    const partida = campeonato.partidas.find(p =>
        (p.jogador1 === jogador1 && p.jogador2 === jogador2) ||
        (p.jogador1 === jogador2 && p.jogador2 === jogador1)
    );

    if (!partida) {
        return res.status(404).json({ mensagem: 'Partida não encontrada' });
    }

    partida.placar = { [jogador1]: placar1, [jogador2]: placar2 };

    const jogador1Data = campeonato.jogadores.find(j => j.nome === jogador1);
    const jogador2Data = campeonato.jogadores.find(j => j.nome === jogador2);

    if (placar1 > placar2) {
        jogador1Data.pontos += 3;
    } else if (placar2 > placar1) {
        jogador2Data.pontos += 3;
    } else {
        jogador1Data.pontos += 1;
        jogador2Data.pontos += 1;
    }

    res.json({ mensagem: 'Resultado registrado com sucesso', campeonato });
});

router.post('/gerar-mata-mata', (req, res) => {
    const { idCampeonato } = req.body;

    const campeonato = campeonatos.find(c => c.id === idCampeonato);
    if (!campeonato) {
        return res.status(404).json({ mensagem: 'Campeonato não encontrado' });
    }

    if (campeonato.fase !== 'fase-de-grupos') {
        return res.status(400).json({ mensagem: 'O mata-mata já foi gerado' });
    }

    campeonato.jogadores.sort((a, b) => b.pontos - a.pontos);

    let classificados = [];
    if (campeonato.jogadores.length >= 16) {
        classificados = campeonato.jogadores.slice(0, 8);
    } else if (campeonato.jogadores.length >= 8) {
        classificados = campeonato.jogadores.slice(0, 4);
    } else {
        classificados = campeonato.jogadores.slice(0, 2);
    }

    campeonato.partidas = gerarMataMata(classificados);
    campeonato.fase = 'mata-mata';

    res.json({ mensagem: 'Mata-mata gerado com sucesso', campeonato });
});

function gerarMataMata(jogadores) {
    let partidas = [];
    let meio = jogadores.length / 2;

    for (let i = 0; i < meio; i++) {
        partidas.push({
            jogador1: jogadores[i].nome,
            jogador2: jogadores[jogadores.length - 1 - i].nome,
            placar: null
        });
    }

    return partidas;
}

router.post('/registrar-resultado-mata-mata', (req, res) => {
    const { idCampeonato, jogador1, jogador2, placar1, placar2 } = req.body;

    const campeonato = campeonatos.find(c => c.id === idCampeonato);
    if (!campeonato) {
        return res.status(404).json({ mensagem: 'Campeonato não encontrado' });
    }

    if (campeonato.fase !== 'mata-mata') {
        return res.status(400).json({ mensagem: 'O campeonato ainda não está no mata-mata' });
    }

    const partida = campeonato.partidas.find(p =>
        (p.jogador1 === jogador1 && p.jogador2 === jogador2) ||
        (p.jogador1 === jogador2 && p.jogador2 === jogador1)
    );

    if (!partida) {
        return res.status(404).json({ mensagem: 'Partida não encontrada' });
    }

    if (placar1 === placar2) {
        return res.status(400).json({ mensagem: 'Empates não são permitidos no mata-mata' });
    }

    const vencedor = placar1 > placar2 ? jogador1 : jogador2;
    partida.placar = { [jogador1]: placar1, [jogador2]: placar2, vencedor };

    campeonato.jogadores = campeonato.jogadores.filter(j => j.nome === vencedor);

    if (campeonato.jogadores.length === 1) {
        campeonato.fase = 'finalizado';
        return res.json({ mensagem: `Campeonato finalizado! Campeão: ${vencedor}`, campeonato });
    }

    campeonato.partidas = gerarMataMata(campeonato.jogadores);
    res.json({ mensagem: 'Resultado registrado, próxima fase gerada!', campeonato });
});


router.get('/', (req, res) => {
    res.json(campeonatos);
});

function gerarPartidas(jogadores) {
    let partidas = [];

    for (let i = 0; i < jogadores.length; i++) {
        for (let j = i + 1; j < jogadores.length; j++) {
            partidas.push({
                jogador1: jogadores[i],
                jogador2: jogadores[j],
                placar: null
            });
        }
    }

    return embaralhar(partidas);
}

function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

module.exports = router;
