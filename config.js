const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');


var serviceAccount = require("./serviceAccount.json"); // Add service account in root folder and name it serviceAccount.json

initializeApp({
  credential: cert(serviceAccount)
});

async function getUserId(token) {
  return await getAuth().verifyIdToken(token).then((decodedToken)=>{
    return decodedToken.uid
  }).catch((error)=>{
    console.log(error.message)
  })
}

module.exports = {getUserId};