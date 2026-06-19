
# Deploy TrustGraph in a Google Cloud Kubernetes cluster using Pulumi

## Overview

This is an installation of TrustGraph on GCP using GKE (managed Kubernetes
platform).

The full stack includes:

- A Kubernetes cluster
- Node pool containing 3 nodes
- Service accounts with access to VertexAI
- Deploys a complete TrustGraph stack of resources in GKE
- GKE Gateway API with Google-managed TLS certificates
- HTTPS access to TrustGraph UI and Grafana via public DNS names

Keys and other configuration for the AI components are configured into
TrustGraph using secrets.

The Pulumi configuration configures a VertexAI Gemini flash 1.5 LLM.

## How it works

This uses Pulumi which is a deployment framework, similar to Terraform
but:
- Pulumi has an open source licence
- Pulumi uses general-purposes programming languages, particularly useful
  because you can use test frameworks to test the infrastructure.

Roadmap to deploy is:
- Install Pulumi
- Setup Pulumi
- Configure your environment with GCP credentials using `gcloud auth login`
- Modify the local configuration to do what you want
- Deploy
- Use the system

# Deploy

## Deploy Pulumi

```
cd pulumi
```

Then:

```
npm install
```

## gke-gcloud-auth-plugin

`gke-gcloud-auth-plugin` is a GCP-specific authentication agent, you need
to have it in your path.

See: https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke

## Setup Pulumi

You need to tell Pulumi which state to use.  You can store this in an S3
bucket, but for experimentation, you can just use local state:

```
pulumi login --local
```

Pulumi operates in stacks, each stack is a separate deployment.  The
git repo contains the configuration for a single stack `gcp`, so you
could:

```
pulumi stack init gcp
```

and it will use the configuration in `Pulumi.gcp.yaml`.

## Configure your environment with GCP credentials

You use `gcloud auth login` and `gcloud auth application-default login`
to set up credentials to GCP.

## Modify the local configuration to do what you want

You can edit:
- settings in `Pulumi.STACKNAME.yaml` e.g. Pulumi.gcp.yaml
- change `resources.yaml` with whatever you want to deploy.
  The resources.yaml file was created using the TrustGraph config portal,
  so you can re-generate your own.

The `Pulumi.STACKNAME.yaml` configuration file contains settings for:

- `trustgraph-gke:environment` - Name of the environment (e.g. dev, prod).
- `trustgraph-gke:region` - GCP region (e.g. us-west3).
- `trustgraph-gke:zone` - GCP zone (e.g. us-west3-a).
- `trustgraph-gke:project` - GCP project ID.
- `trustgraph-gke:domain` - Domain name for the TrustGraph UI
  (e.g. app.example.com).
- `trustgraph-gke:grafana-domain` - Domain name for Grafana
  (e.g. grafana.example.com).

## Deploy

```
pulumi up
```

Just say yes.

If everything works:
- A file `kube.cfg` will also be created which provides access
  to the Kubernetes cluster.

To connect to the Kubernetes cluster...

```
kubectl --kubeconfig kube.cfg -n trustgraph get pods
```

If something goes wrong while deploying, retry before giving up.
`pulumi up` is a retryable command and will continue from
where it left off.

## DNS setup

After deployment, get the Gateway's external IP:

```
kubectl --kubeconfig kube.cfg -n trustgraph get gateway trustgraph-gateway
```

Create DNS A records pointing both your domain and grafana-domain at this
IP address.  Google Certificate Manager will automatically provision and
renew TLS certificates once DNS resolves.

## Use the system

Once DNS is configured, access the services at:

- TrustGraph UI: `https://<your-domain>`
- Grafana: `https://<your-grafana-domain>`

Alternatively, you can use port-forwarding with the `kube.cfg` file:

```
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/api-gateway 8088:8088
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/trustgraph-ui 8888:8888
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/grafana 3000:3000
```

This will allow you to access Grafana and the TrustGraph UI from your local
browser using `http://localhost:3000` and `http://localhost:8888`
respectively.

The IAM bootstrap token and Grafana admin password are auto-generated
by Pulumi.  After deployment, retrieve them with:
```
pulumi stack output iamToken --show-secrets
pulumi stack output grafanaPassword --show-secrets
```

Login to Grafana with username `admin` and the password from the command
above.

To use the TrustGraph API with authentication:
```
export TRUSTGRAPH_TOKEN=$(pulumi stack output iamToken --show-secrets)
```


## Destroy

```
pulumi destroy
```

Just say yes.

## How the config was built

```
./update-config gcp-k8s 2.5.16
```


