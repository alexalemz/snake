// Initialize Firebase
var config = {
    apiKey: "AIzaSyDYuXqrfNquGyM8Im_aP_5mxtyGN8buiBE",
    authDomain: "snake-1f5f5.firebaseapp.com",
    databaseURL: "https://snake-1f5f5.firebaseio.com",
    projectId: "snake-1f5f5",
    storageBucket: "",
    messagingSenderId: "28226935362"
};
firebase.initializeApp(config);


// FirebaseUI config.
var uiConfig = {
    signInSuccessUrl: 'index.html', //'<url-to-redirect-to-on-success>',
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      firebase.auth.EmailAuthProvider.PROVIDER_ID,
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      // firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      // firebase.auth.GithubAuthProvider.PROVIDER_ID,
      // firebase.auth.PhoneAuthProvider.PROVIDER_ID
    ],
    // Terms of service url.
    tosUrl: '<your-tos-url>'
  };

// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());
// The start method will wait until the DOM is loaded.
ui.start('#firebaseui-auth-container', uiConfig);