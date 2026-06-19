import * as pulumi from "@pulumi/pulumi";

pulumi.runtime.setMocks({
    newResource: function(args: pulumi.runtime.MockResourceArgs): {id: string, state: any} {
        return {
            id: args.inputs.name + "_id",
            state: args.inputs,
        };
    },
    call: function(args: pulumi.runtime.MockCallArgs) {
        return args.inputs;
    },
});

describe("Configuration Loading", () => {
    beforeEach(() => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:project": "test-project",
            "project:region": "us-west3",
            "project:zone": "us-west3-a",
            "project:domain": "app.example.com",
            "project:grafana-domain": "grafana.example.com",
        });
    });

    afterEach(() => {
        jest.resetModules();
    });

    test("should load required configuration values", async () => {
        const config = await import("../config");

        expect(config.environment).toBe("test");
        expect(config.project).toBe("test-project");
        expect(config.region).toBe("us-west3");
        expect(config.zone).toBe("us-west3-a");
    });

    test("should generate correct prefix based on environment", async () => {
        const config = await import("../config");

        expect(config.prefix).toBe("trustgraph-test");
    });

    test("should have correct node configuration", async () => {
        const config = await import("../config");

        expect(config.nodeType).toBe("e2-standard-4");
        expect(config.nodeCount).toBe(3);
        expect(config.diskSize).toBe(20);
    });

    test("should load gateway configuration values", async () => {
        const config = await import("../config");

        expect(config.domain).toBe("app.example.com");
        expect(config.grafanaDomain).toBe("grafana.example.com");
    });

    test("should handle missing environment configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:project": "test-project",
            "project:region": "us-west3",
            "project:zone": "us-west3-a",
            "project:domain": "app.example.com",
            "project:grafana-domain": "grafana.example.com",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing project configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:region": "us-west3",
            "project:zone": "us-west3-a",
            "project:domain": "app.example.com",
            "project:grafana-domain": "grafana.example.com",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing region configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:project": "test-project",
            "project:zone": "us-west3-a",
            "project:domain": "app.example.com",
            "project:grafana-domain": "grafana.example.com",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing zone configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:project": "test-project",
            "project:region": "us-west3",
            "project:domain": "app.example.com",
            "project:grafana-domain": "grafana.example.com",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing domain configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:project": "test-project",
            "project:region": "us-west3",
            "project:zone": "us-west3-a",
            "project:grafana-domain": "grafana.example.com",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should handle missing grafana-domain configuration", async () => {
        pulumi.runtime.setAllConfig({
            "project:environment": "test",
            "project:project": "test-project",
            "project:region": "us-west3",
            "project:zone": "us-west3-a",
            "project:domain": "app.example.com",
        });

        await expect(import("../config")).rejects.toThrow();
    });

    test("should generate correct tags separator string", async () => {
        const config = await import("../config");

        expect(config.tagsSep).toBe("");
    });
});
