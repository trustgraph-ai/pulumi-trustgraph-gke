
import * as gcp from "@pulumi/gcp";

import { prefix, project } from './config';

export const svcAccount = new gcp.serviceaccount.Account(
    "svc-account",
    {
        project: project,
        accountId: prefix + "-service-account",
        displayName: "Cluster service account",
    }
);

/*
const vertexAiUserMember = new gcp.projects.IAMMember(
    "vertexai-user-role",
    {
	member: svcAccount.email.apply(x => "serviceAccount:" + x),
	project: project,
	role: "roles/aiplatform.admin",
    },
    {
	provider: provider,
    }
);

*/

