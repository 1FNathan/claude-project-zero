import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.js';
import { flowsRouter } from './routes/flows.js';
import { nodesRouter } from './routes/nodes.js';
import { edgesRouter } from './routes/edges.js';
import { exportRouter } from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Mount sub-routers before the flows router to avoid prefix conflicts
app.use('/api/flows/:flowId/nodes', nodesRouter);
app.use('/api/flows/:flowId/edges', edgesRouter);
app.use('/api/flows/:flowId/export', exportRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
