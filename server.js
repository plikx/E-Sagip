const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth');
const operationRoutes = require('./routes/operations');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Link Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/operations', operationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`E-Sagip Backend Bridge online on port ${PORT}`);
});