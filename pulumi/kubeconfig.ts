
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as command from "@pulumi/command";
import * as gcp from "@pulumi/gcp";

import { cluster } from './cluster';
import { prefix } from './config';
import { gcpProvider } from './gcp-provider';

export const token = cluster.name.apply(
    () => {
        const cmd = new command.local.Command(
            "gke-gcloud-auth-plugin",
            {
                create: "gke-gcloud-auth-plugin",
            }
        );
        return cmd.stdout.apply(
            x => JSON.parse(x)
        ).apply(
            x => x["status"]["token"]
        );
    }
);

export const kubeconfig = pulumi.all([
    cluster.name, cluster.endpoint, cluster.masterAuth, token,
]).apply(
    ([name, endpoint, auth, token]) => {

        const ca = auth.clusterCaCertificate;
        const cert = auth.clientCertificate;
        const key = auth.clientKey;

        const config = {
            apiVersion: "v1",
            kind: "Config",
            "current-context": "context",
            clusters: [
                {
                    name: "cluster",
                    cluster: {
                        "certificate-authority-data": ca,
                        server: `https://${endpoint}`
                    },
                }
            ],
            contexts: [
                {
                    name: "context",
                    context: {
                        cluster: "cluster",
                        user: "user",
                    },
                }
            ],
            users: [
                {
                    name: "user",
                    user: {
                        "token": token,
                    },
                }
            ],
            preferences: {}
        };

        return JSON.stringify(config);
        
    }
);

