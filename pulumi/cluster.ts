
import * as gcp from "@pulumi/gcp";

import { gcpProvider } from './gcp-provider';
import { prefix, zone, project } from './config';
import { nodeType, nodeCount, diskSize } from './config';
import { svcAccount } from './service-account';

export const cluster = new gcp.container.Cluster(
    "cluster",
    {
        name: prefix,
        location: zone,
        removeDefaultNodePool: true,
        initialNodeCount: 1,
        nodeConfig: {
            // Initial node, doesn't matter
            diskSizeGb: 20, 
            machineType: "e2-small",
            serviceAccount: svcAccount.email,
            oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
        },
        deletionProtection: false,
        gatewayApiConfig: {
            channel: "CHANNEL_STANDARD"
        },
    },
    {
        provider: gcpProvider,
        ignoreChanges: ["nodeConfig"],
    }
);

export const nodePool = new gcp.container.NodePool(
    "node-pool",
    {
        name: prefix + "-pool1",
        cluster: cluster.id,
        nodeCount: nodeCount,
        nodeConfig: {
            machineType: nodeType,
            diskSizeGb: diskSize,
            serviceAccount: svcAccount.email,
            oauthScopes: ["https://www.googleapis.com/auth/cloud-platform"],
        },
    },
    {
        provider: gcpProvider,
//        ignoreChanges: ["nodeConfig"],
    }
);

