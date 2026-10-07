const firebaseConfig = {
    apiKey: 'AIzaSyDdryluZZkl2L_rr0JKB7UTPn3uEiPtN58',
    authDomain: 'barbearia-stylish.firebaseapp.com',
    databaseURL: 'https://barbearia-stylish-default-rtdb.firebaseio.com/',
    projectId: 'barbearia-stylish',
    appId: '1:1020786177120:web:f811711a5934ab9e2fbf05'
};

window.bookingFirebaseReady = (async () => {
    if (!window.firebase || Object.values(firebaseConfig).some(value => value.startsWith('COLE_'))) {
        return false;
    }

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    await firebase.auth().signInAnonymously();
    window.bookingDatabase = firebase.database();
    return true;
})();
