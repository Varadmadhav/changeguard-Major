
import { createDeploymentHttpServer } from './api/deployment.api.ts';

const port = Number(process.env.PORT || 5001);

const server = createDeploymentHttpServer();

server.listen(port, () => {
  console.log(`ChangeGuard backend running at http://localhost:${port}`);
});
