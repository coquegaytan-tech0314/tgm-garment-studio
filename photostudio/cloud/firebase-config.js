/* Client firebaseConfig for project tgm-garment-studio.
   Web app “TGM Garment Studio” created by Account Manager.
   apiKey is expected in browser apps (restricted by HTTP referrer + Storage rules).
   This PR does not change Storage rules.
*/
const firebaseConfig = {
  apiKey: "AIzaSyD-qGSXaVEMQERz07Eabu9M-T2_7a5Q7Gc",
  authDomain: "tgm-garment-studio.firebaseapp.com",
  projectId: "tgm-garment-studio",
  storageBucket: "tgm-garment-studio.firebasestorage.app",
  messagingSenderId: "821421188029",
  appId: "1:821421188029:web:ffe938352ab2eef8dce8"
};
const TGM_FIREBASE_PROJECT_ID = firebaseConfig.projectId;
const TGM_FIREBASE_STORAGE_BUCKET = firebaseConfig.storageBucket;
const TGM_FIREBASE_CONFIG = firebaseConfig;
const TGM_FIREBASE_SDK = {
  app: 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  storage: 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js'
};
function tgmFirebaseConfigUsable(config){
  const cfg = config || TGM_FIREBASE_CONFIG;
  return Boolean(cfg.apiKey && cfg.appId && cfg.projectId === TGM_FIREBASE_PROJECT_ID && cfg.storageBucket === TGM_FIREBASE_STORAGE_BUCKET);
}
function tgmFirebaseInitConfig(config){
  return {...(config || TGM_FIREBASE_CONFIG)};
}
