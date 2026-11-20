/* ---------- Firebase(ログイン・クラウド保存・ランキング)の設定 ----------
   Firebase コンソールの「プロジェクトの設定」→「マイアプリ」にある firebaseConfig をここに入れる。
   null のままなら、ログイン関係のボタンは出ず、今までどおりこの端末だけに保存して遊べる。
   (この値はページに公開されるもので、パスワードではない。守りは Firestore のルールで行う) */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDxj9AW0NtA_zXS42SGKomJyElSJqlZUgA',
  authDomain: 'ground-staff-sim.firebaseapp.com',
  projectId: 'ground-staff-sim',
  storageBucket: 'ground-staff-sim.firebasestorage.app',
  messagingSenderId: '696311434831',
  appId: '1:696311434831:web:6c953a776baa7e85cc243a',
};
