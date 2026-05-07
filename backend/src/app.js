const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { env } = require('./config/env');
const tenderRoutes = require('./routes/tender.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const agentRoutes = require('./routes/agent.routes');
const { errorMiddleware } = require('./middleware/error.middleware');
const { notFoundMiddleware } = require('./middleware/notFound.middleware');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service healthy',
    data: { status: 'healthy' },
  });
});

app.use('/api/tenders', tenderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agent', agentRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
