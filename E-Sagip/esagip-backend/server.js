const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const operationRoutes = require('./routes/operations');
const auditRoutes = require('./routes/audit'); 
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Root route for health checks
app.get('/', (req, res) => {
    res.send('E-Sagip backend is running');
});

// Link Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/audit', auditRoutes);     
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`E-Sagip Backend Bridge online on port ${PORT}`);
});
