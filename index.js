require('dotenv').config();
const express = require('express');
const cors = require('cors');

const campeonatoRoutes = require('./src/routes/championship.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.send('Servidor rodando...');
});

app.use('/campeonato', campeonatoRoutes);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
