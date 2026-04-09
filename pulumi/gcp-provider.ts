
import * as gcp from "@pulumi/gcp";

import { project, region } from './config';

export const gcpProvider = new gcp.Provider(
    "gcp-provider",
    {
        project: project,
        region: region,
    }
);

