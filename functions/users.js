// Import necessary modules and functions
const { firestore } = require("firebase-admin");
const {
    getUserId
  } = require("../config"); // Import your custom configuration and getUserId function
const {
  getFirestore
} = require('firebase-admin/firestore'); // Import Firebase Firestore related functions
const { 
  getStorage
} =  require("firebase-admin/storage"); // Import Firebase Storage related functions
const uuid = require('uuid-v4');

function generateUsername() {
  const number = Math.floor(Math.random() * 1000000); // Generates a random number up to 999999
  return `user${number}`;
}

function extractKeys(sourceObject, keysToExtract, internal) {
  const result = {};

  for (const key in sourceObject) {
    if (keysToExtract.includes(key)) {
      result[key] = sourceObject[key];
    }
  }

  if (internal === true) {
    return result
  } else {
    return {...result, following: sourceObject.following.length, followers: sourceObject.followers.length};
  }
}

// Create an instance of Firebase Firestore & Storage
const db = getFirestore();
const storage = getStorage();

// Define a variable for the response
var res;

const response = (success, message) => {
  return {
    success: success,
    message: message
  };
};

const storageUrl = "https://firebasestorage.googleapis.com/v0/b/realchat-4fd5d.appspot.com/o"
// Define a variable for the response
var res;

const uploadImages = async (user, file) => {
  const bf = Buffer.from(file[0].buffer)
  const token =  uuid();

  await storage.bucket("gs://realchat-4fd5d.appspot.com").file(`${file[0].originalname}`).save(bf);
  const finalUrl = `${storageUrl}/${file[0].originalname}?alt=media&token=${token}`
  return finalUrl;
}

async function getUsers(username, limitQ, last) {
  const keysToKeep = ['username', 'name', "profilepicture", "banner", "description"];
  // Query looks for usernames that start with the given parameter
  if (last === undefined) {
    var users = db.collection("users").where('username', ">=", username).where('username', '<', username + "z").limit(parseInt(limitQ));
  } else {
    const lastDoc = await db.collection("users").doc(last).get()
    var users = db.collection("users").where('username', ">=", username).where('username', '<', username + "z").limit(parseInt(limitQ)).startAfter(lastDoc);
  }
  
  var usersSnapshot = (await users.get()).docs.map(doc => {
    return ({ id: doc.id, info: extractKeys(doc.data(), keysToKeep, false)})
  });

  return usersSnapshot;
}
// Function for getting user data
async function getUser(username, token, id, internal) {
  if (internal === true) {
    var keysToKeep = ['username', 'name', "profilepicture", "banner", "description", "likes", "comments", "following", "followers"];
  } else {
    var keysToKeep = ['username', 'name', "profilepicture", "banner", "description"];
  }

  if ( username !== undefined && username !== "me" ) {
    var userData = await db.collection("users").where('username', "==", username).get();
  } else if ( id === undefined ) {
    var currUser = await getUserId(token)
    var userData = await db.collection("users").where(firestore.FieldPath.documentId(), "==", currUser).get();
  } else {
    var userData = await db.collection("users").where(firestore.FieldPath.documentId(), "==", id).get();

  } 

  // Checks if the user exists
  if (!userData.empty) {
    if (userData.docs[0].id === currUser) {
      var user = { id: userData.docs[0].id, info: userData.docs[0].data() }
    } else {
      var user = { id: userData.docs[0].id, info: extractKeys(userData.docs[0].data(), keysToKeep, internal) }
    }
  } else {
    var user = response(false, "No user found with that id!");
  }

  return user;
}

// Function for updating user information
async function updateUser(updatedData, token, banner, profilepicture) {
  const currentUser = await getUserId(token)
  const userDoc = db.collection("users").doc(currentUser)
  
  if (banner !== undefined) {
    const uploadedBanner = await uploadImages(currentUser, banner)
    updatedData["banner"] = uploadedBanner
  }

  if (profilepicture !== undefined) {
    const uploadedPP = await uploadImages(currentUser, profilepicture)
    updatedData["profilepicture"] = uploadedPP
  }

  const keysList = [
    "profilepicture",
    "banner",
    "name",
    "username",
    "description",
    "posts",
    "comments",
    "likes",
    "reposts",
    "followers",
    "following",
    "private"
  ]

  // Remove keys from updatedData that are not allowed
  Object.keys(updatedData).forEach((key) => {
    if (!keysList.includes(key)) {
      delete updatedData[key]
    }
  })

  await userDoc.update(
    updatedData
  ).then(async () => {
    res = {...response(true, "User has been successfully updated"), updatedData}
  }).catch((error) => {
    res = response(false, error.message)
  })

  return res;
}

// Function for updating user information
async function updateUsername(newUsername, token,) {
  const currentUser = await getUserId(token)

  const usersDocs = await db.collection("users").where("username", "==", newUsername).get()

  if (usersDocs.docs.length === 0) {
    db.collection("users").doc(currentUser).update({
      username: newUsername
    })
    return {updatedData: {username: newUsername}, ...response(true, "Username has been successfully updated!")}
  } else {
    return response(false, "Username is already used!")
  }
}

// Function to follow and unfollow
async function followersUpdate(token, user) {
  const currentUser = await getUserId(token)
  const userRef = db.collection("users").doc(currentUser)
  const userDoc = await userRef.get()

  var newFollowing;
  var newFollowers;
  var action;
  var res;

  const newFollow = await getUser(user, undefined, undefined, true)

  if (userDoc.data().following.includes(newFollow.id) === true) {
    action = "decrement"
    newFollowing = userDoc.data().following.filter(following => following !== newFollow.id)
    newFollowers = newFollow.info.followers.filter(follower => follower !== currentUser)
  } else {
    action = "increment"
    newFollowing = [newFollow.id, ...userDoc.data().following]
    newFollowers = [currentUser, ...newFollow.info.followers]
  }

  

  await userRef.update({
    following: newFollowing
  }).then(async ()=>{
    await db.collection("users").doc(newFollow.id).update({
      followers: newFollowers
    }).then(()=>{
      res = {...response(true, "Updated successfully!"), action, user: newFollow.id}
    }).catch(()=>{
      res = response(false, "An error has occured!")
    })
  }).catch(()=>{
    res = response(false, "An error has occured!")
  })

  return res
}

// Function for creating a user
async function createUser(initialData, token) {
  const currentUser = await getUserId(token)
  const userDoc = db.collection("users").doc(currentUser)

  const newUserDoc = {
    profilepicture: "https://firebasestorage.googleapis.com/v0/b/realchat-4fd5d.appspot.com/o/default-profile.png?alt=media&token=38761a1a-ce9c-4356-9589-96a70069e795",
    banner: "https://firebasestorage.googleapis.com/v0/b/realchat-4fd5d.appspot.com/o/default-banner.png?alt=media&token=9c871edd-35ca-43c2-8e2f-4076775e7135",
    name: initialData.name === undefined ? "" : initialData.name,
    username: generateUsername(),
    description: "",
    joinedAt: Date.now(),
    comments: [],
    likes: [],
    reposts: [],
    followers: [],
    following: []
  }

  return await userDoc.set(
    newUserDoc, {
      merge: true
    }
  ).then(() => {
    return response(true, "Account created successfully")
  }).catch((error)=>{
    return response(false, error.message)
  })
}

// Export the functions for external use
module.exports = {
  getUsers,
  updateUser,
  createUser,
  followersUpdate,
  uploadImages,
  updateUsername,
  getUser
}
