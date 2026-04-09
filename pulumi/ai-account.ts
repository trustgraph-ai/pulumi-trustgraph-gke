
import * as gcp from "@pulumi/gcp";

import { gcpProvider } from './gcp-provider';
import { prefix, project } from './config';

export const aiSvcAccount = new gcp.serviceaccount.Account(
    "ai-svc-account",
    {
        project: project,
        accountId: prefix + "-ai",
        displayName: "TrustGraph AI service account",
    }
);

const vertexAiUserMember = new gcp.projects.IAMMember(
    "ai-vertexai-role",
    {
	member: aiSvcAccount.email.apply(x => "serviceAccount:" + x),
	project: project,
	role: "roles/aiplatform.admin",
    },
    { provider: gcpProvider }
);

export const aiSvcKey = new gcp.serviceaccount.Key(
    "ai-svc-account-key",
    {
        serviceAccountId: aiSvcAccount.name,
        privateKeyType: "TYPE_GOOGLE_CREDENTIALS_FILE",
    },
    { provider: gcpProvider }
);

