require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

app.post('/crear-pago', async (req, res) => {
    try {
        const body = {
            items: [
                {
                    title: req.body.titulo,
                    quantity: 1,
                    unit_price: Number(req.body.precio),
                    currency_id: 'COP'
                }
            ],
            back_urls: {
                success: "https://shefaplusglobal.com/exito",
                failure: "https://shefaplusglobal.com/error"
            },
            auto_return: "approved",
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });
        
        res.json({ enlaceDePago: result.init_point });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor de pagos" });
    }
});

app.listen(port, () => {
    console.log("=========================================");
    console.log("🌐 SERVIDOR SHEFA PLUS GLOBAL ENCENDIDO");
    console.log(`🚀 Escuchando a la interfaz en el puerto ${port}`);
    console.log("=========================================");
});
