# Running Yoga in Minikube

## Prerequisites

Make sure you have all of these installed before starting:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)
- PowerShell 7+

---

## Architecture Overview

```
Internet
   |
LoadBalancer (minikube tunnel)
   |
api-gateway (Kubernetes)
   |
auth / users / media / ... (Kubernetes - ClusterIP)
   |
Postgres / Redis / Kafka (Docker Compose - external)
```

Your NestJS services run in Kubernetes.
Your infrastructure (Postgres, Redis, Kafka) runs in Docker Compose.

---

## Step 1 — Start Infrastructure (Docker Compose)

Start your databases, Kafka, and Redis first:

```bash
docker compose up -d
```

u can add --build 

---

## Step 2 — Start Minikube

```bash
minikube start
```

To give it more resources (you better do that):

```bash
minikube start --cpus=8 --memory=7122
```

Verify it is running:

```bash
kubectl get nodes
```

---

## Step 3 — Point Docker to Minikube's Daemon

This is the key step that makes locally built images available inside minikube
without needing to push them to a registry

```powershell
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
```

> IMPORTANT: This only applies to your current terminal session.
> You must run this before building images, and keep this terminal open for the remaining steps.

---

## Step 4 — Update .env Files for Docker Compose Connectivity

Your NestJS services inside Kubernetes need to reach Postgres/Redis/Kafka
running in Docker Compose. Use `host.docker.internal` as the hostname.

Example for `apps/auth-service/.env`:

```env
DB_HOST=host.docker.internal
DB_PORT=5433
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
KAFKA_BROKERS=host.docker.internal:9093
```

Repeat this for each service, using its corresponding port from your docker-compose.yml.
ill leave a .env.example inside each service.

> On Linux,that will not run u need to resolve `host.docker.internal` manually

---

## Step 5 — (Optional) Preview Your Secrets

Before pushing anything to the cluster, verify your .env files are being
merged correctly:

i made a script that only generate the secrets without touching kubectl

```powershell
.\k8s\helm\scripts\secret.preview.ps1
```

Check the `.secrets-preview/` folder and confirm all keys/values look right.

---

## Step 6 — Build Docker Images

From the same terminal where you ran the minikube docker-env command:

```powershell
.\k8s\helm\scripts\build-images.ps1
```

Verify the images were built inside minikube:

```bash
minikube image ls | grep yoga
```

You should see all 10 services listed.

Also you can upload them in dockerhub and change the values inside values.yaml in helm

---

## Step 7 — Push Secrets to the Cluster

```powershell
.\k8s\helm\scripts\secrets.ps1
```

Verify secrets were created:

```bash
kubectl get secrets -n yoga
```

You should see one secret per service, e.g. `yoga-auth-service-env`.

---

## Step 8 — Install with Helm

```powershell
helm install yoga .\k8s\helm\chart -n yoga --create-namespace
```

Verify all pods are running:

```bash
kubectl get pods -n yoga
```

All pods should reach `Running` status. If any are stuck in `Pending` or
`CrashLoopBackOff`, check the logs:

```bash
kubectl logs -n yoga <pod-name>
```

---

## Step 9 — Expose the API Gateway

Because the api-gateway uses `LoadBalancer`, you need minikube tunnel
to get an external IP:

```bash
minikube tunnel
```

> Keep this running in a separate terminal. It requires sudo/admin.

Then get the external IP:

```bash
kubectl get svc -n yoga yoga-api-gateway
```

The `EXTERNAL-IP` column will show an IP once the tunnel is active.
Your API is now reachable at `http://<EXTERNAL-IP>:8000`.

---

## Useful Commands

```bash
# Watch all pods
kubectl get pods -n yoga -w

# Logs for a specific service
kubectl logs -n yoga deployment/yoga-auth-service

# Restart a deployment after rebuilding its image
kubectl rollout restart deployment/yoga-auth-service -n yoga

# Uninstall everything
helm uninstall yoga -n yoga

# Stop minikube
minikube stop

# Wipe minikube entirely and start fresh
minikube delete
```

---

## Updating a Service

After changing code and rebuilding:

```powershell
# 1. Make sure minikube docker-env is active in your terminal
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# 2. Rebuild only the changed service
.\k8s\helm\scripts\build-images.ps1 -Services @("auth-service")

# 3. Restart the deployment to pick up the new image
kubectl rollout restart deployment/yoga-auth-service -n yoga
```

---

## Troubleshooting

**Pods stuck in `ImagePullBackOff`**
You forgot to run the minikube docker-env command before building.
Re-run Step 3 and Step 6.

**Pods stuck in `CrashLoopBackOff`**
Check the logs. Most likely a wrong DB_HOST or missing env variable.

```bash
kubectl logs -n yoga <pod-name>
```

**Cannot reach host.docker.internal**
See the Linux note in Step 4.

**minikube tunnel keeps dying**
Run it in a dedicated terminal with admin/sudo privileges and keep it open.


# small note
i have not  added any health checks.
if you want to add them  i suggest the following:

```bash
npm install @nestjs/terminus
```

Then in each service's app module:

```typescript
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
```

and

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

and add this to helm

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3

livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

***ENJOY***
