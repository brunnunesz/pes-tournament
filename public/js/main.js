const API_URL = "http://localhost:3000/campeonato";

let campeonatoSelecionado = null;
let jogadoresCadastrados = [];

/**
 * Alterna entre modo claro e escuro
 */
function toggleDarkMode() {
    const body = document.querySelector('body');
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    }
}

/**
 * Exibe a seção solicitada e oculta as demais
 */
function mostrarSecao(secaoID) {
    document.getElementById('secaoCampeonatos').style.display = 'none';
    document.getElementById('secaoTabela').style.display = 'none';
    document.getElementById('secaoMataMata').style.display = 'none';
    document.getElementById('secaoTimes').style.display = 'none';
    document.getElementById('secaoConfiguracoes').style.display = 'none';

    const secao = document.getElementById(secaoID);
    if (secao) {
        secao.style.display = 'block';
        // Caso seja a seção de times, carrega as infos
        if (secaoID === 'secaoTimes') {
            inicializarTimes();
        }
        // Caso seja a seção de configurações, carrega seletores
        if (secaoID === 'secaoConfiguracoes') {
            carregarCampeonatosParaEdicao();
        }
    }
}

/**
 * Abre/fecha modais
 */
function abrirModal() {
    document.getElementById("modalResultado").style.display = "block";
}
function fecharModal() {
    document.getElementById("modalResultado").style.display = "none";
}
function abrirModalJogador() {
    document.getElementById("modalJogador").style.display = "block";
    document.getElementById("nomeJogador").value = "";
}
function fecharModalJogador() {
    document.getElementById("modalJogador").style.display = "none";
}

/**
 * Adiciona jogador ao array local antes de criar campeonato
 */
function adicionarJogador() {
    const nome = document.getElementById("nomeJogador").value.trim();
    if (!nome) {
        alert("Informe o nome do jogador");
        return;
    }
    // “logo” não é obrigatório aqui; jogador pode ter ou não ter time
    jogadoresCadastrados.push({ nome, logo: '' });
    atualizarListaJogadores();
    fecharModalJogador();
}

function atualizarListaJogadores() {
    const ul = document.getElementById("listaJogadoresUL");
    ul.innerHTML = "";

    jogadoresCadastrados.forEach((jogador) => {
        const li = document.createElement("li");
        li.innerText = jogador.nome;
        ul.appendChild(li);
    });
}

/**
 * Sorteia times para jogadores, se o nº de jogadores == nº de times
 */
async function sortearTimes() {
    const response = await fetch("http://localhost:3000/times");
    const times = await response.json();

    if (jogadoresCadastrados.length !== times.length) {
        alert("O número de jogadores deve ser igual ao número de times cadastrados para sortear.");
        return;
    }
    // Embaralha times
    let timesEmbaralhados = [...times];
    for (let i = timesEmbaralhados.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [timesEmbaralhados[i], timesEmbaralhados[j]] = [timesEmbaralhados[j], timesEmbaralhados[i]];
    }

    jogadoresCadastrados = jogadoresCadastrados.map((jogador, index) => {
        return { nome: jogador.nome, logo: timesEmbaralhados[index].logo };
    });
    atualizarListaJogadores();
}

/**
 * Cria efetivamente um campeonato no backend
 */
async function criarCampeonato() {
    const nome = document.getElementById("nomeCampeonato").value.trim();
    if (!nome || jogadoresCadastrados.length < 2) {
        alert("Informe o nome do campeonato e adicione pelo menos dois jogadores!");
        return;
    }

    const response = await fetch(`${API_URL}/criar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, jogadores: jogadoresCadastrados })
    });

    if (response.ok) {
        alert("Campeonato criado com sucesso!");
        jogadoresCadastrados = [];
        atualizarListaJogadores();
        carregarCampeonatos();
    } else {
        alert("Erro ao criar campeonato.");
    }
}

/**
 * Carrega a lista de campeonatos na tela principal
 */
async function carregarCampeonatos() {
    const response = await fetch(API_URL);
    const campeonatos = await response.json();
    const lista = document.getElementById("campeonatos");
    lista.innerHTML = "";

    campeonatos.forEach(c => {
        const item = document.createElement("li");
        let textoItem = `${c.nome} - ${c.jogadores.length} jogadores`;
        if (c.fase === 'finalizado' && c.campeao) {
            textoItem += ` | 🏆 ${c.campeao}`;
        }
        item.innerText = textoItem;
        item.onclick = () => {
            exibirCampeonato(c.id);
            mostrarSecao('secaoTabela');
        };
        lista.appendChild(item);
    });
}

/**
 * Exibe detalhes do campeonato (tabela e partidas)
 */
async function exibirCampeonato(idCampeonato) {
    const response = await fetch(`${API_URL}/${idCampeonato}`);
    const campeonato = await response.json();
    campeonatoSelecionado = campeonato;

    if (!campeonato) {
        alert("Campeonato não encontrado.");
        return;
    }

    document.getElementById("titulo-campeonato").innerText =
        (campeonato.fase === 'finalizado' && campeonato.campeao)
            ? `Campeonato Finalizado! 🏆 ${campeonato.campeao}`
            : `Tabela de Pontos - ${campeonato.nome}`;

    // Preenche a tabela de jogadores
    const tabelaJogadores = document.getElementById("tabela-jogadores").querySelector("tbody");
    tabelaJogadores.innerHTML = "";

    campeonato.jogadores.forEach(jogador => {
        const row = tabelaJogadores.insertRow();
        const cell = row.insertCell(0);

        if (jogador.logo) {
            const img = document.createElement("img");
            // Agora servimos a imagem em /uploads/<nomeArquivo>
            img.src = `uploads/${jogador.logo}`;
            img.style.width = "30px";
            img.style.height = "30px";
            cell.appendChild(img);
            const span = document.createElement("span");
            span.innerText = " " + jogador.nome;
            cell.appendChild(span);
        } else {
            cell.innerText = jogador.nome;
        }

        row.insertCell(1).innerText = jogador.pontos;
        row.insertCell(2).innerText = jogador.golsMarcados;
        row.insertCell(3).innerText = jogador.golsSofridos;
        row.insertCell(4).innerText = jogador.vitorias;
        row.insertCell(5).innerText = jogador.empates;
        row.insertCell(6).innerText = jogador.derrotas;
    });

    // Preenche a tabela de partidas
    const tabelaPartidas = document.getElementById("tabela-partidas").querySelector("tbody");
    tabelaPartidas.innerHTML = "";

    let todasComPlacar = true;
    campeonato.partidas.forEach(partida => {
        if (!partida.placar) {
            todasComPlacar = false;
        }
    });

    const btnGerar = document.getElementById("btnGerarMataMata");
    if (campeonato.fase === 'fase-de-grupos' && todasComPlacar) {
        btnGerar.style.display = 'inline-block';
    } else {
        btnGerar.style.display = 'none';
    }

    campeonato.partidas.forEach(partida => {
        const row = tabelaPartidas.insertRow();
        const cell1 = row.insertCell(0);

        const logo1 = getLogoForJogador(partida.jogador1);
        if (logo1) {
            const img = document.createElement("img");
            img.src = `uploads/${logo1}`;
            img.style.width = "30px";
            img.style.height = "30px";
            cell1.appendChild(img);
            const span = document.createElement("span");
            span.innerText = " " + partida.jogador1;
            cell1.appendChild(span);
        } else {
            cell1.innerText = partida.jogador1;
        }

        const cell2 = row.insertCell(1);
        cell2.innerText = partida.placar
            ? `${partida.placar[partida.jogador1]} - ${partida.placar[partida.jogador2]}`
            : "Aguardando";

        const cell3 = row.insertCell(2);
        const logo2 = getLogoForJogador(partida.jogador2);
        if (logo2) {
            const img = document.createElement("img");
            img.src = `uploads/${logo2}`;
            img.style.width = "30px";
            img.style.height = "30px";
            cell3.appendChild(img);
            const span = document.createElement("span");
            span.innerText = " " + partida.jogador2;
            cell3.appendChild(span);
        } else {
            cell3.innerText = partida.jogador2;
        }

        const cell4 = row.insertCell();
        const btn = document.createElement("button");
        btn.innerText = "Editar";
        btn.onclick = function () {
            abrirModalResultadoParaEdicao(partida);
        };
        cell4.appendChild(btn);
    });
}

function getLogoForJogador(nome) {
    const jogador = campeonatoSelecionado.jogadores.find(j => j.nome === nome);
    return jogador && jogador.logo ? jogador.logo : null;
}

/**
 * Abre modal para registrar resultado em partida sem placar
 */
function abrirModalResultado() {
    if (!campeonatoSelecionado) {
        alert("Selecione um campeonato primeiro.");
        return;
    }

    const partidaSelecionada = document.getElementById("partidaSelecionada");
    partidaSelecionada.innerHTML = "";

    const labelJ1 = document.getElementById("labelJogador1");
    const labelJ2 = document.getElementById("labelJogador2");
    document.getElementById("placar1").value = 0;
    document.getElementById("placar2").value = 0;

    let partidasPendentes = 0;
    campeonatoSelecionado.partidas.forEach(partida => {
        if (!partida.placar) {
            const option = document.createElement("option");
            option.value = `${partida.jogador1}|${partida.jogador2}`;
            option.textContent = `${partida.jogador1} vs ${partida.jogador2}`;
            partidaSelecionada.appendChild(option);
            partidasPendentes++;
        }
    });

    if (partidasPendentes === 0) {
        alert("Não há partidas pendentes.");
        return;
    }

    const [j1, j2] = partidaSelecionada.options[0].value.split("|");
    labelJ1.innerText = j1;
    labelJ2.innerText = j2;

    abrirModal();
}

/**
 * Abre modal para editar resultado de uma partida que já tem placar
 */
function abrirModalResultadoParaEdicao(partida) {
    if (!campeonatoSelecionado) {
        alert("Selecione um campeonato primeiro.");
        return;
    }

    const partidaSelecionada = document.getElementById("partidaSelecionada");
    partidaSelecionada.innerHTML = "";

    const labelJ1 = document.getElementById("labelJogador1");
    const labelJ2 = document.getElementById("labelJogador2");
    document.getElementById("placar1").value = partida.placar ? partida.placar[partida.jogador1] : 0;
    document.getElementById("placar2").value = partida.placar ? partida.placar[partida.jogador2] : 0;

    const option = document.createElement("option");
    option.value = `${partida.jogador1}|${partida.jogador2}`;
    option.textContent = `${partida.jogador1} vs ${partida.jogador2}`;
    partidaSelecionada.appendChild(option);

    labelJ1.innerText = partida.jogador1;
    labelJ2.innerText = partida.jogador2;

    abrirModal();
}

/**
 * Salva (ou edita) o resultado
 */
async function registrarResultado() {
    if (!campeonatoSelecionado) {
        alert("Selecione um campeonato primeiro.");
        return;
    }

    const partidaVal = document.getElementById("partidaSelecionada").value;
    if (!partidaVal) {
        alert("Selecione uma partida!");
        return;
    }

    const [jogador1, jogador2] = partidaVal.split("|");
    const placar1 = parseInt(document.getElementById("placar1").value);
    const placar2 = parseInt(document.getElementById("placar2").value);

    if (isNaN(placar1) || isNaN(placar2)) {
        alert("Informe um placar válido.");
        return;
    }

    let url = `${API_URL}/registrar-resultado`;
    const partida = campeonatoSelecionado.partidas.find(
        p => (p.jogador1 === jogador1 && p.jogador2 === jogador2) ||
            (p.jogador1 === jogador2 && p.jogador2 === jogador1)
    );
    if (partida && partida.placar) {
        url = `${API_URL}/editar-resultado`;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            idCampeonato: campeonatoSelecionado.id,
            jogador1,
            jogador2,
            placar1,
            placar2
        })
    });

    if (response.ok) {
        fecharModal();
        const data = await response.json();
        campeonatoSelecionado = data.campeonato;

        alert(url.includes("editar") ? "Resultado editado com sucesso!" : "Resultado registrado com sucesso!");
        if (campeonatoSelecionado.fase === 'finalizado' && campeonatoSelecionado.campeao) {
            alert(`Temos um campeão: ${campeonatoSelecionado.campeao}`);
        }

        if (campeonatoSelecionado.fase === 'mata-mata') {
            mostrarSecao('secaoMataMata');
            exibirMataMata();
        } else {
            exibirCampeonato(campeonatoSelecionado.id);
        }
    } else {
        const errData = await response.json();
        alert(errData.mensagem || "Erro ao registrar resultado.");
    }
}

/**
 * Gera o mata-mata com base na classificação
 */
async function gerarMataMata() {
    if (!campeonatoSelecionado) {
        alert("Nenhum campeonato selecionado!");
        return;
    }
    const response = await fetch(`${API_URL}/gerar-mata-mata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCampeonato: campeonatoSelecionado.id })
    });

    const data = await response.json();
    if (response.ok) {
        alert(data.mensagem);
        campeonatoSelecionado = data.campeonato;
        mostrarSecao('secaoMataMata');
        exibirMataMata();
    } else {
        alert(data.mensagem || "Erro ao gerar mata-mata");
    }
}

/**
 * Exibe visualmente o mata-mata
 */
function exibirMataMata() {
    const container = document.getElementById("containerMataMata");
    container.innerHTML = "";

    document.getElementById("tituloMataMata").innerText =
        (campeonatoSelecionado.fase === 'finalizado' && campeonatoSelecionado.campeao)
            ? `Campeão: 🏆 ${campeonatoSelecionado.campeao}`
            : `Mata-Mata - ${campeonatoSelecionado.nome}`;

    if (campeonatoSelecionado.fase !== "mata-mata" && campeonatoSelecionado.fase !== 'finalizado') {
        container.innerHTML = `<p>O campeonato ainda não está no mata-mata ou já foi finalizado.</p>`;
        return;
    }

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";

    campeonatoSelecionado.partidas.forEach(partida => {
        const li = document.createElement("li");
        li.style.margin = "10px 0";
        const placarStr = partida.placar
            ? `(${partida.placar[partida.jogador1]} - ${partida.placar[partida.jogador2]})`
            : "(Aguardando)";
        li.innerText = `${partida.jogador1} vs ${partida.jogador2} ${placarStr}`;
        ul.appendChild(li);
    });

    container.appendChild(ul);
}

/**
 * Cadastra um time enviando o formData com o arquivo
 */
async function cadastrarTime() {
    const nome = document.getElementById("nomeTime").value.trim();
    const fileInput = document.getElementById("arquivoTime");

    if (!nome) {
        alert("Informe o nome do time");
        return;
    }

    // Monta FormData
    const formData = new FormData();
    formData.append('nome', nome);
    if (fileInput.files.length > 0) {
        formData.append('logoFile', fileInput.files[0]);
    }

    const response = await fetch("http://localhost:3000/times", {
        method: "POST",
        body: formData
    });

    if (response.ok) {
        alert("Time cadastrado com sucesso!");
        document.getElementById("nomeTime").value = "";
        fileInput.value = "";
        carregarTimes();
    } else {
        alert("Erro ao cadastrar time.");
    }
}

/**
 * Inicializa a parte de times: carrega a lista
 */
async function inicializarTimes() {
    carregarTimes();
}

/**
 * Carrega lista de times
 */
async function carregarTimes() {
    const response = await fetch("http://localhost:3000/times");
    const times = await response.json();
    const lista = document.getElementById("listaTimes");
    lista.innerHTML = "";

    times.forEach(time => {
        const li = document.createElement("li");
        // Se existir logo, mostra
        if (time.logo) {
            const img = document.createElement("img");
            img.src = `uploads/${time.logo}`;
            img.style.width = "30px";
            img.style.height = "30px";
            li.appendChild(img);
            const span = document.createElement("span");
            span.innerText = " " + time.nome;
            li.appendChild(span);
        } else {
            li.innerText = time.nome;
        }
        lista.appendChild(li);
    });
}

/* -------------- SEÇÃO DE CONFIGURAÇÕES -------------- */

/**
 * Carrega a lista de campeonatos para popular o select de edição
 */
async function carregarCampeonatosParaEdicao() {
    const response = await fetch(API_URL);
    const campeonatos = await response.json();
    const select = document.getElementById("selectCampeonatoEdicao");

    select.innerHTML = `<option value="">-- Selecione --</option>`;
    campeonatos.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        let texto = c.nome;
        if (c.fase === 'finalizado' && c.campeao) {
            texto += ` | 🏆 ${c.campeao}`;
        }
        option.textContent = texto;
        select.appendChild(option);
    });
}

/**
 * Quando escolho um campeonato no select de edição, carrega infos
 */
async function carregarDadosParaEdicao() {
    const select = document.getElementById("selectCampeonatoEdicao");
    const idCampeonato = parseInt(select.value);
    if (!idCampeonato) {
        document.getElementById("configuracaoDetalhes").style.display = "none";
        return;
    }

    // Busca detalhes do campeonato
    const response = await fetch(`${API_URL}/${idCampeonato}`);
    if (!response.ok) {
        alert("Erro ao carregar detalhes do campeonato.");
        return;
    }
    const campeonato = await response.json();

    document.getElementById("configuracaoDetalhes").style.display = "block";

    document.getElementById("editarNomeCampeonato").value = campeonato.nome;

    // Lista jogadores
    const ulJogadoresEdicao = document.getElementById("listaJogadoresEdicao");
    ulJogadoresEdicao.innerHTML = "";

    campeonato.jogadores.forEach((jog, index) => {
        const li = document.createElement("li");
        li.style.margin = "8px 0";

        const inputNome = document.createElement("input");
        inputNome.type = "text";
        inputNome.value = jog.nome;
        inputNome.dataset.index = index;
        inputNome.style.width = "200px";

        li.appendChild(inputNome);

        // Exibe a logo se existir
        if (jog.logo) {
            const img = document.createElement("img");
            img.src = `uploads/${jog.logo}`;
            img.style.width = "30px";
            img.style.height = "30px";
            img.style.marginLeft = "10px";
            li.appendChild(img);
        }

        ulJogadoresEdicao.appendChild(li);
    });
}

/**
 * Salva as alterações de nome e jogadores
 */
async function salvarEdicoesCampeonato() {
    const select = document.getElementById("selectCampeonatoEdicao");
    const idCampeonato = parseInt(select.value);
    if (!idCampeonato) {
        alert("Selecione um campeonato para salvar.");
        return;
    }

    const novoNome = document.getElementById("editarNomeCampeonato").value.trim();

    // Pega jogadores do UL
    const ulJogadoresEdicao = document.getElementById("listaJogadoresEdicao");
    const inputs = ulJogadoresEdicao.querySelectorAll("input");
    const novosJogadores = [];

    inputs.forEach((inp) => {
        const nome = inp.value.trim();
        if (nome) {
            // Para simplificar, mantemos logo vazio aqui. Ou poderíamos buscar a logo anterior.
            novosJogadores.push({ nome });
        }
    });

    const corpoReq = {
        novoNome,
        novosJogadores
    };

    const response = await fetch(`${API_URL}/editar/${idCampeonato}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpoReq)
    });

    if (response.ok) {
        alert("Campeonato atualizado com sucesso!");
        carregarCampeonatos();
        carregarCampeonatosParaEdicao();
    } else {
        alert("Erro ao atualizar campeonato.");
    }
}

/**
 * Ao carregar a página, busca campeonatos e exibe primeiro
 */
document.addEventListener("DOMContentLoaded", () => {
    carregarCampeonatos();
    mostrarSecao('secaoCampeonatos');
});
