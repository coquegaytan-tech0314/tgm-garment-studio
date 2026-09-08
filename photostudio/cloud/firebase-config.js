/* Client firebaseConfig for project tgm-garment-studio.
   apiKey is expected in browser apps (restricted by HTTP referrer + Storage rules).
   Web app “TGM Garment Studio” provided by Account Manager.

   Required fields:
   - apiKey
   - projectId          = tgm-garment-studio
   - storageBucket      = tgm-garment-studio.firebasestorage.app
   - appId
*/
const TGM_FIREBASE_PROJECT_ID = 'tgm-garment-studio';
const TGM_FIREBASE_STORAGE_BUCKET = 'tgm-garment-studio.firebasestorage.app';
const TGM_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD-qGSXaVEMQERz07Eabu9M-T2_7a5Q7Gc',
  authDomain: 'tgm-garment-studio.firebaseapp.com',
  projectId: TGM_FIREBASE_PROJECT_ID,
  storageBucket: TGM_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: '821421188029',
  appId: '1:821421188029:web:ffe938352ab2eef8dce8'
};
const TGM_FIREBASE_SDK = {
  app: 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  storage: 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js'
};
function tgmFirebaseConfigUsable(config){
  const cfg = config || TGM_FIREBASE_CONFIG;
  return Boolean(cfg.apiKey && !String(cfg.apiKey).startsWith('TODO_') && cfg.projectId === TGM_FIREBASE_PROJECT_ID && cfg.storageBucket === TGM_FIREBASE_STORAGE_BUCKET);
}
function tgmFirebaseInitConfig(config){
  const cfg = {...(config || TGM_FIREBASE_CONFIG)};
  for(const key of Object.keys(cfg))if(String(cfg[key]).startsWith('TODO_') || cfg[key]==='')delete cfg[key];
  return cfg;
}
