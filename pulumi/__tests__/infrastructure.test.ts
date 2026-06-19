import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";

jest.mock('@pulumi/command', () => {
    const pulumiSdk = jest.requireActual('@pulumi/pulumi');
    return {
        local: {
            Command: class extends pulumiSdk.CustomResource {
                public readonly stdout: any;
                constructor(name: string, args?: any, opts?: any) {
                    super('command:local:Command', name, args, opts);
                    this.stdout = pulumiSdk.output(JSON.stringify({ status: { token: "mock-token" } }));
                }
            },
        },
    };
});

// Mock fs module for resources.yaml
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Global arrays to capture resources across all tests
const createdResources: Array<{type: string, name: string, inputs: any}> = [];
let resourceCount = 0;

describe("Infrastructure Creation", () => {
    beforeAll(() => {
        // Mock file system
        mockedFs.writeFile.mockImplementation(jest.fn() as any);
        mockedFs.readFileSync.mockReturnValue(`
apiVersion: v1
kind: Namespace
metadata:
  name: trustgraph
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: trustgraph
spec:
  replicas: 1
        `);

        // Set up configuration
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:project": "test-project",
            "project:region": "us-west3",
            "project:zone": "us-west3-a",
            "project:domain": "app.example.com",
            "project:grafana-domain": "grafana.example.com",
        });

        // Set up mocks to capture resource creation
        pulumi.runtime.setMocks({
            newResource: function(args: pulumi.runtime.MockResourceArgs): {id: string, state: any} {
                resourceCount++;
                createdResources.push({
                    type: args.type,
                    name: args.name,
                    inputs: args.inputs
                });

                const mockId = `mock-${args.type}-${args.name}-${resourceCount}`;
                let state: any = {
                    ...args.inputs,
                    id: mockId,
                    name: args.inputs.name || args.name,
                };

                // Mock specific resource outputs
                if (args.type === "google-native:container/v1:Cluster" ||
                    args.type === "gcp:container/cluster:Cluster") {
                    state.name = "trustgraph-test";
                    state.endpoint = "10.0.0.1";
                    state.masterAuth = {
                        clusterCaCertificate: "mock-ca-cert",
                        clientCertificate: "mock-client-cert",
                        clientKey: "mock-client-key",
                    };
                }

                if (args.type === "kubernetes:gateway.networking.k8s.io/v1:Gateway") {
                    state.status = { addresses: [{ value: "1.2.3.4" }] };
                }

                if (args.type === "command:local:Command") {
                    state.stdout = JSON.stringify({
                        status: { token: "mock-token" }
                    });
                }

                if (args.type === "gcp:serviceaccount/account:Account") {
                    state.email = "mock@test-project.iam.gserviceaccount.com";
                }

                if (args.type === "gcp:serviceaccount/key:Key") {
                    state.privateKey = btoa(JSON.stringify({ type: "service_account" }));
                }

                return { id: mockId, state };
            },
            call: function(args: pulumi.runtime.MockCallArgs) {
                return args.inputs;
            },
        });
    });

    test("infrastructure creates all expected resources correctly", async () => {
        const infraModule = await import("../index");

        expect(infraModule.gatewayIp).toBeDefined();

        // Wait a bit for async resource creation to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify that resources were created
        expect(createdResources.length).toBeGreaterThan(0);

        // Check for essential GCP resources
        const gcpProvider = createdResources.find(r => r.type === "pulumi:providers:gcp");
        const cluster = createdResources.find(r => r.type === "gcp:container/cluster:Cluster");
        const nodePool = createdResources.find(r => r.type === "gcp:container/nodePool:NodePool");
        const svcAccount = createdResources.find(
            r => r.type === "gcp:serviceaccount/account:Account" && r.name === "svc-account"
        );
        const aiSvcAccount = createdResources.find(
            r => r.type === "gcp:serviceaccount/account:Account" && r.name === "ai-svc-account"
        );
        const aiSvcKey = createdResources.find(r => r.type === "gcp:serviceaccount/key:Key");
        const aiRole = createdResources.find(r => r.type === "gcp:projects/iAMMember:IAMMember");

        // Test resource existence
        expect(gcpProvider).toBeDefined();
        expect(cluster).toBeDefined();
        expect(nodePool).toBeDefined();
        expect(svcAccount).toBeDefined();
        expect(aiSvcAccount).toBeDefined();
        expect(aiSvcKey).toBeDefined();
        expect(aiRole).toBeDefined();

        // Test cluster configuration
        expect(cluster?.inputs.name).toBe("trustgraph-test");
        expect(cluster?.inputs.deletionProtection).toBe(false);
        expect(cluster?.inputs.gatewayApiConfig).toEqual({ channel: "CHANNEL_STANDARD" });

        // Test node pool configuration
        expect(nodePool?.inputs.nodeCount).toBe(3);
        expect(nodePool?.inputs.nodeConfig?.machineType).toBe("e2-standard-4");
        expect(nodePool?.inputs.nodeConfig?.diskSizeGb).toBe(20);

        // Test Kubernetes secrets
        const secrets = createdResources.filter(r => r.type === "kubernetes:core/v1:Secret");
        const iamSecret = secrets.find(s => s.inputs.metadata?.name === "iam-bootstrap-token");
        const grafanaSecret = secrets.find(s => s.inputs.metadata?.name === "grafana-secret");
        const aiSecret = secrets.find(s => s.inputs.metadata?.name === "vertexai-creds");

        expect(iamSecret).toBeDefined();
        expect(grafanaSecret).toBeDefined();
        expect(aiSecret).toBeDefined();
        expect(iamSecret?.inputs.metadata?.namespace).toBe("trustgraph");
        expect(grafanaSecret?.inputs.metadata?.namespace).toBe("trustgraph");
        expect(aiSecret?.inputs.metadata?.namespace).toBe("trustgraph");

        // Check for Google Certificate Manager resources
        const uiCert = createdResources.find(
            r => r.type === "gcp:certificatemanager/certificate:Certificate"
                && r.name === "ui-cert"
        );
        const grafanaCert = createdResources.find(
            r => r.type === "gcp:certificatemanager/certificate:Certificate"
                && r.name === "grafana-cert"
        );
        const certMap = createdResources.find(
            r => r.type === "gcp:certificatemanager/certificateMap:CertificateMap"
        );
        const uiMapEntry = createdResources.find(
            r => r.type === "gcp:certificatemanager/certificateMapEntry:CertificateMapEntry"
                && r.name === "ui-cert-map-entry"
        );
        const grafanaMapEntry = createdResources.find(
            r => r.type === "gcp:certificatemanager/certificateMapEntry:CertificateMapEntry"
                && r.name === "grafana-cert-map-entry"
        );

        expect(uiCert).toBeDefined();
        expect(grafanaCert).toBeDefined();
        expect(certMap).toBeDefined();
        expect(uiMapEntry).toBeDefined();
        expect(grafanaMapEntry).toBeDefined();

        // Check for Gateway
        const gw = createdResources.find(
            r => r.type === "kubernetes:gateway.networking.k8s.io/v1:Gateway"
        );
        expect(gw).toBeDefined();
        expect(gw?.inputs.spec?.gatewayClassName).toBe("gke-l7-global-external-managed");
        expect(gw?.inputs.spec?.listeners).toHaveLength(2);

        // Check for HTTPRoutes
        const uiRoute = createdResources.find(
            r => r.type === "kubernetes:gateway.networking.k8s.io/v1:HTTPRoute"
                && r.name === "ui-route"
        );
        const grafanaRoute = createdResources.find(
            r => r.type === "kubernetes:gateway.networking.k8s.io/v1:HTTPRoute"
                && r.name === "grafana-route"
        );
        expect(uiRoute).toBeDefined();
        expect(grafanaRoute).toBeDefined();
    });
});
