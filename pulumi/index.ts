
import * as fs from 'fs';

import { cluster } from './cluster';
import { kubeconfig } from './kubeconfig';
import { appDeploy } from './app';

// --------------------------------------------------------------------------

// Write the kubeconfig to a file
kubeconfig.apply(
    (key : string) => {
        fs.writeFile(
            "kube.cfg",
            key,
            err => {
                if (err) {
                    console.log(err);
                    throw(err);
                } else {
                    console.log("Wrote kube.cfg.");
                }
            }
        );
    }
);

// --------------------------------------------------------------------------

// Have to reference these things here so that they get deployed
const keep = [
    cluster,
    appDeploy,
];

