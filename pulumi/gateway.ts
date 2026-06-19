
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";

import { gcpProvider } from './gcp-provider';
import { k8sProvider } from './k8s-provider';
import { domain, grafanaDomain } from './config';
import { appDeploy } from './app';

// ---------- Google Certificate Manager ----------

const uiCertificate = new gcp.certificatemanager.Certificate(
    "ui-cert",
    {
        name: "trustgraph-ui-cert",
        managed: {
            domains: [domain],
        },
    },
    { provider: gcpProvider }
);

const grafanaCertificate = new gcp.certificatemanager.Certificate(
    "grafana-cert",
    {
        name: "trustgraph-grafana-cert",
        managed: {
            domains: [grafanaDomain],
        },
    },
    { provider: gcpProvider }
);

const certificateMap = new gcp.certificatemanager.CertificateMap(
    "cert-map",
    {
        name: "trustgraph-cert-map",
    },
    { provider: gcpProvider }
);

const uiCertMapEntry = new gcp.certificatemanager.CertificateMapEntry(
    "ui-cert-map-entry",
    {
        name: "trustgraph-ui-entry",
        map: certificateMap.name,
        hostname: domain,
        certificates: [uiCertificate.id],
    },
    { provider: gcpProvider }
);

const grafanaCertMapEntry = new gcp.certificatemanager.CertificateMapEntry(
    "grafana-cert-map-entry",
    {
        name: "trustgraph-grafana-entry",
        map: certificateMap.name,
        hostname: grafanaDomain,
        certificates: [grafanaCertificate.id],
    },
    { provider: gcpProvider }
);

// ---------- Gateway + Routes ----------

const gateway = new k8s.apiextensions.CustomResource(
    "trustgraph-gateway",
    {
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "Gateway",
        metadata: {
            name: "trustgraph-gateway",
            namespace: "trustgraph",
            annotations: {
                "networking.gke.io/certmap": certificateMap.name,
            },
        },
        spec: {
            gatewayClassName: "gke-l7-global-external-managed",
            listeners: [
                {
                    name: "http",
                    protocol: "HTTP",
                    port: 80,
                    allowedRoutes: {
                        namespaces: { from: "Same" },
                    },
                },
                {
                    name: "https",
                    protocol: "HTTPS",
                    port: 443,
                    tls: {
                        mode: "Terminate",
                    },
                    allowedRoutes: {
                        namespaces: { from: "Same" },
                    },
                },
            ],
        },
    },
    {
        provider: k8sProvider,
        dependsOn: [appDeploy, uiCertMapEntry, grafanaCertMapEntry],
    }
);

const uiRoute = new k8s.apiextensions.CustomResource(
    "ui-route",
    {
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "HTTPRoute",
        metadata: {
            name: "ui-route",
            namespace: "trustgraph",
        },
        spec: {
            parentRefs: [
                {
                    name: "trustgraph-gateway",
                    sectionName: "https",
                },
                {
                    name: "trustgraph-gateway",
                    sectionName: "http",
                },
            ],
            hostnames: [domain],
            rules: [{
                backendRefs: [{
                    name: "trustgraph-ui",
                    port: 8888,
                }],
            }],
        },
    },
    { provider: k8sProvider, dependsOn: [gateway] }
);

export const gatewayIp = pulumi.output(gateway).apply(
    (gw: any) => gw?.status?.addresses?.[0]?.value || "pending"
);

const grafanaRoute = new k8s.apiextensions.CustomResource(
    "grafana-route",
    {
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "HTTPRoute",
        metadata: {
            name: "grafana-route",
            namespace: "trustgraph",
        },
        spec: {
            parentRefs: [
                {
                    name: "trustgraph-gateway",
                    sectionName: "https",
                },
                {
                    name: "trustgraph-gateway",
                    sectionName: "http",
                },
            ],
            hostnames: [grafanaDomain],
            rules: [{
                backendRefs: [{
                    name: "grafana",
                    port: 3000,
                }],
            }],
        },
    },
    { provider: k8sProvider, dependsOn: [gateway] }
);
