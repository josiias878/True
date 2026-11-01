'use strict';
// Creates only the VAPID credentials. Never write them into the published klar folder.
const fs=require('node:fs'),path=require('node:path');
const webpush=require('../klar/node_modules/web-push');
const destination=process.argv[2];
if(!destination||!path.isAbsolute(destination))throw Error('Specify an absolute output path outside this repository.');
const repo=path.resolve(__dirname,'..');
const parent=fs.realpathSync(path.dirname(destination));
if(parent===repo||parent.startsWith(repo+path.sep))throw Error('Choose a directory outside this repository.');
const keys=webpush.generateVAPIDKeys();
fs.writeFileSync(destination,`KLAR_VAPID_PUBLIC_KEY=${keys.publicKey}\nKLAR_VAPID_PRIVATE_KEY=${keys.privateKey}\nKLAR_VAPID_SUBJECT=https://tranquil-melomakarona-403b3f.netlify.app\n`,{mode:0o600,flag:'wx'});
console.log('VAPID credentials saved outside the repository. Import them into Netlify environment variables, Functions scope. No secrets printed.');
