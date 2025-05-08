
# Deploy TrustGraph in a Google Cloud Kubernetes cluster using Pulumi

## Overview

This is an installation of TrustGraph on GCP using GKE (managed Kubernetes
platform).

The full stack includes:

- A Kubernetes cluster
- Node pool containing 2 nodes
- Service accounts with access to VertexAI
- Deploys a complete TrustGraph stack of resources in AKS

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
- Configure your environment with Azure credentials using `az login`
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
git repo contains the configuration for a single stack `azure`, so you
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
- settings in `Pulumi.STACKNAME.yaml` e.g. Pulumi.azure.yaml
- change `resources.yaml` with whatever you want to deploy.
  The resources.yaml file was created using the TrustGraph config portal,
  so you can re-generate your own.

The `Pulumi.STACKNAME.yaml` configuration file contains settings for:

```
  trustgraph-gke:environment: dev
  trustgraph-gke:region: us-west3
  trustgraph-gke:zone: us-west3-a
  trustgraph-gke:project: trustgraph-demo
  gcp:disableGlobalProjectWarning: "true"
```

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

## Use the system

To get access to TrustGraph using the `kube.cfg` file, set up some
port-forwarding.  You'll need multiple terminal windows to run each of
these commands:

```
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/api-gateway 8088:8088
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/workbench-ui 8888:8888
kubectl --kubeconfig kube.cfg -n trustgraph port-forward service/grafana 3000:3000
```

This will allow you to access Grafana and the Workbench UI from your local
browser using `http://localhost:3000` and `http://localhost:8888`
respectively.


## Deploy

```
pulumi destroy
```

Just say yes.

