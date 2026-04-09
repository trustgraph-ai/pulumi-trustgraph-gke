
import * as fs from 'fs';
import * as k8s from '@pulumi/kubernetes';

import { k8sProvider } from './k8s-provider';
import { aiSvcKey } from './ai-account';

// Get application resource definitions
const resourceDefs = fs.readFileSync("../resources.yaml", {encoding: "utf-8"});

// Deploy resources to the K8s cluster
export const appDeploy = new k8s.yaml.v2.ConfigGroup(
    "resources",
    {
        yaml: resourceDefs,
        skipAwait: true,
    },
    { provider: k8sProvider }
);

// Generate an (empty) gateway secret - no authentication
const gatewaySecret = new k8s.core.v1.Secret(
    "gateway-secret",
    {
        metadata: {
            name: "gateway-secret",
            namespace: "trustgraph"
        },
        stringData: {
            "gateway-secret": ""
        },
    },
    { provider: k8sProvider, dependsOn: appDeploy }
);

const credential = aiSvcKey.privateKey.apply(atob);

// Generate VertexAI creds
const aiSecret = new k8s.core.v1.Secret(
    "ai-secret",
    {
        metadata: {
            name: "vertexai-creds",
            namespace: "trustgraph"
        },
        stringData: {
            "private.json": credential
        },
    },
    { provider: k8sProvider, dependsOn: appDeploy }
);

// Generate an (empty) MCP server secret - no authentication
const mcpServerSecret = new k8s.core.v1.Secret(
    "mcp-server-secret",
    {
        metadata: {
            name: "mcp-server-secret",
            namespace: "trustgraph"
        },
        stringData: {
            "mcp-server-secret": ""
        },
    },
    { provider: k8sProvider, dependsOn: appDeploy }
);

