const express = require('express');
const router = express.Router();

let campeonatos = [];

/**
 * Retorna todos os campeonatos
 */
router.get('/', (req, res) => {
    res.json(campeonatos);
});

/**
 * Retorna um campeonato pelo ID
 */
router.get('/:id', (req, res) => {
    const campeonato = campeonatos.find(c => c.id === parseInt(req.params.id));
    if (!campeonato) return res.status(404).json({ mensagem: 'Campeonato não encontrado' });
    res.json(campeonato);
});

/**
 * Cria um novo campeonato
 */
router.post('/criar', (req, res) => {
    const { nome, jogadores } = req.body;

    if (!nome || !jogadores || !Array.isArray(jogadores) || jogadores.length < 2) {
        return res.status(400).json({
            mensagem: 'Nome do campeonato e ao menos dois jogadores são obrigatórios'
        });
    }

    const jogadoresMapeados = jogadores.map((jog, index) => {
        if (typeof jog === 'object') {
            return {
                id: index + 1,
                nome: jog.nome,
                logo: jog.logo || '',
                pontos: 0,
                golsMarcados: 0,
                golsSofridos: 0,
                vitorias: 0,
                empates: 0,
                derrotas: 0
            };
        }
        return {
            id: index + 1,
            nome: jog,
            logo: '',
            pontos: 0,
            golsMarcados: 0,
            golsSofridos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0
        };
    });

    const novoCampeonato = {
        id: campeonatos.length + 1,
        nome,
        jogadores: jogadoresMapeados,
        partidas: gerarPartidas(jogadoresMapeados),
        fase: 'fase-de-grupos',
        campeao: null
    };

    campeonatos.push(novoCampeonato);
    res.status(201).json(novoCampeonato);
});

/**
 * Edita informações gerais de um campeonato (nome, jogadores, etc.)
 */
router.put('/editar/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const campeonatoIndex = campeonatos.findIndex(c => c.id === id);
    if (campeonatoIndex === -1) {
        return res.status(404).json({ mensagem: "Campeonato não encontrado" });
    }

    const campeonatoExistente = campeonatos[campeonatoIndex];
    const {
        novoNome,
        novosJogadores  // array de { nome, logo } ou string
    } = req.body;

    // Se tiver novo nome, atualiza
    if (novoNome) {
        campeonatoExistente.nome = novoNome;
    }

    // Se tiver jogadores para atualizar/adicionar
    if (Array.isArray(novosJogadores)) {
        // Substitui completamente a lista de jogadores
        const jogadoresMapeados = novosJogadores.map((jog, index) => ({
            id: index + 1,
            nome: jog.nome,
            logo: jog.logo || '',
            pontos: jog.pontos || 0,
            golsMarcados: jog.golsMarcados || 0,
            golsSofridos: jog.golsSofridos || 0,
            vitorias: jog.vitorias || 0,
            empates: jog.empates || 0,
            derrotas: jog.derrotas || 0
        }));
        campeonatoExistente.jogadores = jogadoresMapeados;
        // Caso queira gerar novas partidas, descomente:
        // campeonatoExistente.partidas = gerarPartidas(jogadoresMapeados);
    }

    campeonatos[campeonatoIndex] = campeonatoExistente;
    res.json({
        mensagem: "Campeonato editado com sucesso",
        campeonato: campeonatos[campeonatoIndex]
    });
});

/**
 * Registrar resultado de uma partida
 */
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

    if (campeonato.fase === 'fase-de-grupos') {
        const jogador1Data = campeonato.jogadores.find(j => j.nome === jogador1);
        const jogador2Data = campeonato.jogadores.find(j => j.nome === jogador2);

        jogador1Data.golsMarcados += placar1;
        jogador1Data.golsSofridos += placar2;
        jogador2Data.golsMarcados += placar2;
        jogador2Data.golsSofridos += placar1;

        if (placar1 > placar2) {
            jogador1Data.vitorias += 1;
            jogador1Data.pontos += 3;
            jogador2Data.derrotas += 1;
        } else if (placar2 > placar1) {
            jogador2Data.vitorias += 1;
            jogador2Data.pontos += 3;
            jogador1Data.derrotas += 1;
        } else {
            jogador1Data.empates += 1;
            jogador2Data.empates += 1;
            jogador1Data.pontos += 1;
            jogador2Data.pontos += 1;
        }

        // Ordena jogadores pela pontuação
        campeonato.jogadores.sort((a, b) => b.pontos - a.pontos);

    } else if (campeonato.fase === 'mata-mata') {
        if (placar1 === placar2) {
            return res.status(400).json({
                mensagem: 'Empates não são permitidos no mata-mata. Defina um vencedor.'
            });
        }
    }

    if (campeonato.fase === 'mata-mata') {
        avancarRodadaMataMata(campeonato);
    }

    res.json({
        mensagem: 'Resultado registrado com sucesso',
        campeonato
    });
});

/**
 * Editar resultado já existente
 */
router.post('/editar-resultado', (req, res) => {
    const { idCampeonato, jogador1, jogador2, placar1, placar2 } = req.body;
    const campeonato = campeonatos.find(c => c.id === idCampeonato);

    if (!campeonato) return res.status(404).json({ mensagem: 'Campeonato não encontrado' });

    const partida = campeonato.partidas.find(p =>
        (p.jogador1 === jogador1 && p.jogador2 === jogador2) ||
        (p.jogador1 === jogador2 && p.jogador2 === jogador1)
    );

    if (!partida) return res.status(404).json({ mensagem: 'Partida não encontrada' });

    // Se for fase de grupos, desfaz a pontuação anterior
    if (campeonato.fase === 'fase-de-grupos' && partida.placar) {
        const prevPlac1 = partida.placar[jogador1];
        const prevPlac2 = partida.placar[jogador2];

        const jogador1Data = campeonato.jogadores.find(j => j.nome === jogador1);
        const jogador2Data = campeonato.jogadores.find(j => j.nome === jogador2);

        jogador1Data.golsMarcados -= prevPlac1;
        jogador1Data.golsSofridos -= prevPlac2;
        jogador2Data.golsMarcados -= prevPlac2;
        jogador2Data.golsSofridos -= prevPlac1;

        if (prevPlac1 > prevPlac2) {
            jogador1Data.vitorias -= 1;
            jogador1Data.pontos -= 3;
            jogador2Data.derrotas -= 1;
        } else if (prevPlac2 > prevPlac1) {
            jogador2Data.vitorias -= 1;
            jogador2Data.pontos -= 3;
            jogador1Data.derrotas -= 1;
        } else {
            jogador1Data.empates -= 1;
            jogador2Data.empates -= 1;
            jogador1Data.pontos -= 1;
            jogador2Data.pontos -= 1;
        }
    }

    // Re-registra o placar
    partida.placar = { [jogador1]: placar1, [jogador2]: placar2 };

    // Atualiza dados dos jogadores
    if (campeonato.fase === 'fase-de-grupos') {
        const jogador1Data = campeonato.jogadores.find(j => j.nome === jogador1);
        const jogador2Data = campeonato.jogadores.find(j => j.nome === jogador2);

        jogador1Data.golsMarcados += placar1;
        jogador1Data.golsSofridos += placar2;
        jogador2Data.golsMarcados += placar2;
        jogador2Data.golsSofridos += placar1;

        if (placar1 > placar2) {
            jogador1Data.vitorias += 1;
            jogador1Data.pontos += 3;
            jogador2Data.derrotas += 1;
        } else if (placar2 > placar1) {
            jogador2Data.vitorias += 1;
            jogador2Data.pontos += 3;
            jogador1Data.derrotas += 1;
        } else {
            jogador1Data.empates += 1;
            jogador2Data.empates += 1;
            jogador1Data.pontos += 1;
            jogador2Data.pontos += 1;
        }

        campeonato.jogadores.sort((a, b) => b.pontos - a.pontos);

    } else if (campeonato.fase === 'mata-mata') {
        if (placar1 === placar2) {
            return res.status(400).json({
                mensagem: 'Empates não são permitidos no mata-mata. Defina um vencedor.'
            });
        }
    }

    if (campeonato.fase === 'mata-mata') avancarRodadaMataMata(campeonato);

    res.json({
        mensagem: 'Resultado editado com sucesso',
        campeonato
    });
});

/**
 * Gera o chaveamento de mata-mata, conforme pontuação
 */
router.post('/gerar-mata-mata', (req, res) => {
    const { idCampeonato } = req.body;
    const campeonato = campeonatos.find(c => c.id === idCampeonato);

    if (!campeonato) return res.status(404).json({ mensagem: 'Campeonato não encontrado' });
    if (campeonato.fase !== 'fase-de-grupos') {
        return res.status(400).json({
            mensagem: 'O mata-mata já foi gerado ou o campeonato está finalizado.'
        });
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

    res.json({
        mensagem: 'Mata-mata gerado com sucesso',
        campeonato
    });
});

/**
 * Função auxiliar para gerar as partidas do mata-mata
 */
function gerarMataMata(jogadores) {
    let partidas = [];
    const meio = Math.floor(jogadores.length / 2);
    for (let i = 0; i < meio; i++) {
        partidas.push({
            jogador1: jogadores[i].nome,
            jogador2: jogadores[jogadores.length - 1 - i].nome,
            placar: null
        });
    }
    return embaralhar(partidas);
}

/**
 * Gera todas as partidas em formato "todos contra todos"
 */
function gerarPartidas(jogadores) {
    let partidas = [];
    for (let i = 0; i < jogadores.length; i++) {
        for (let j = i + 1; j < jogadores.length; j++) {
            partidas.push({
                jogador1: jogadores[i].nome,
                jogador2: jogadores[j].nome,
                placar: null
            });
        }
    }
    return embaralhar(partidas);
}

/**
 * Embaralha um array (Fisher–Yates shuffle)
 */
function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Avança as rodadas do mata-mata
 */
function avancarRodadaMataMata(campeonato) {
    const todasDefinidas = campeonato.partidas.every(p => p.placar);
    if (!todasDefinidas) return;

    let vencedores = [];
    campeonato.partidas.forEach(p => {
        const nomes = Object.keys(p.placar);
        const placar1 = p.placar[nomes[0]];
        const placar2 = p.placar[nomes[1]];
        const vencedor = placar1 > placar2 ? nomes[0] : nomes[1];
        vencedores.push(vencedor);
    });

    if (vencedores.length === 1) {
        // Finalizamos o campeonato
        campeonato.fase = 'finalizado';
        campeonato.campeao = vencedores[0];
        return;
    }

    let jogadoresObj = vencedores.map((v, i) => ({ id: i + 1, nome: v }));
    campeonato.partidas = gerarMataMata(jogadoresObj);
}

module.exports = router;
