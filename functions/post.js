// Import necessary modules and functions
const {
  getUserId
} = require("../config"); // Import your custom configuration and getUserId function
const {
getFirestore
} = require('firebase-admin/firestore'); // Import Firebase Firestore related functions
const { 
getStorage
} =  require("firebase-admin/storage"); // Import Firebase Storage related functions
const { 
  firestore 
} = require("firebase-admin");
const { getUser } = require("./users"); // Import a function for getting user data
const uuid = require('uuid-v4');

// Create an instance of Firebase Firestore and Storage
const db = getFirestore();
const storage = getStorage();

const storageUrl = "https://firebasestorage.googleapis.com/v0/b/realchat-4fd5d.appspot.com/o"

// Define a variable for the response
var res;

const uploadImages = async (user, file) => {
  const bf = Buffer.from(file.buffer)
  const token =  uuid();

  await storage.bucket("gs://realchat-4fd5d.appspot.com").file(`${file.originalname}`).save(bf);
  const finalUrl = `${storageUrl}/${file.originalname}?alt=media&token=${token}`
  return finalUrl;
}

const cleanLikes = async(post) => {
  const usersQuery = db.collection("users").where("likes", "array-contains", post);

  try {
    const usersSnapshot = await usersQuery.get();

    const batch = db.batch();

    usersSnapshot.forEach((userDoc) => {
      const userRef = userDoc.ref;
      batch.update(userRef, {
        likes: firestore.FieldValue.arrayRemove(post),
      });
    });

    await batch.commit();
    console.log(`Removed post ${post} from the "likes" array for ${usersSnapshot.size} users.`);
  } catch (error) {
    console.error("Error removing post from users' likes:", error);
  }
} 

const cleanReplies = async(user, post) => {
  await db.collection("users").doc(user).update({
    comments: firestore.FieldValue.arrayRemove(post)
  })
}

// Define a utility function for creating a response object
const response = (success, message) => {
return {
  success: success,
  message: message
};
};

// Function for adding a post
async function addPost(data, token, images, postId) {
if (token !== undefined) {
  const currUser = await getUserId(token)

  // Validates the data types of the provided values for security purposes
  if (typeof (data.content) === "string" && typeof (images) === "object") {
    
    // Pass the values to a new object to get rid of any additional keys
    const cleanDoc = {
      userId: currUser,
      postedAt: Date.now(),
      content: data.content,
      media: [],
      reposts: 0,
      likes: 0,
      impressions: 0
    };

    const downloadURLs = images.map(async (image) => {
      return await uploadImages(undefined, image)
    })
    
    
    res = Promise.all(downloadURLs)
      .then((urls)=>{
        cleanDoc.media = urls
      })
      .then(async()=>{
        // Adds the new post to a new document in the "posts" collection
        const addedPost = postId === undefined ? await db.collection("posts").add(cleanDoc) : await db.collection("posts/"+postId+"/replies").add(cleanDoc)

        if (postId !== undefined) {
          db.collection("users").doc(currUser).update({
            comments: firestore.FieldValue.arrayUnion(postId + "/replies/" + addedPost.id)
          })
        }

        return {
          post: {
            postPath: addedPost.id,
            post: {...cleanDoc, comments: 0}
          }
        };
      })
  } else {
    res = response(false, "An error has occurred!")
  }
} else {
  res = response(false, "You need to be logged in to perform this action!")
}

return res;
}

// Function for retrieving posts
async function getPosts(last, tab, username) {
  if (username !== undefined) {
    const profile = await getUser(username, undefined, undefined, true);
    const currProfile = profile.id;

    if (tab === "likes") {
      const likedPosts = [];
      for (const liked of profile.info.likes.reverse().slice(parseInt(last), parseInt(last) + 5)) {
        const likedPost = await db.doc("posts/"+liked).get();
        if (likedPost.exists) {
          const user = await getUser(undefined, undefined, likedPost.data().userId)
          const repliesLength = await db.collection("posts/"+liked+"/replies").get()
          likedPosts.push({
            user: user,
            postPath: liked,
            post: {...likedPost.data(), comments: repliesLength.docs.length}
          });
        }
      }
      res = {user: currProfile, posts: likedPosts};

    } else if (tab === "media") {
      const coll = db.collection("posts")
      if (last === undefined) {
        // Query to retrieve the first 10 documents in the collection
        var postSnapshot = await coll.where("userId", "==", currProfile).where("media", "!=", []).orderBy("media").orderBy("postedAt", "desc").limit(5).get()
      } else {
        // Query to retrieve the next 10 documents in the collection starting from the 'last' parameter
        const lastDoc = await coll.doc(last).get();
        var postSnapshot = await coll.where("userId", "==", currProfile).where("media", "!=", []).orderBy("media").orderBy("postedAt", "desc").startAfter(lastDoc).limit(5).get()
      }

      const posts = []
      for (const post of postSnapshot.docs) {
        const repliesLength = await db.collection("posts/"+post.id+"/replies").get()
        posts.push({
          postPath: post.id,
          post: {...post.data(), comments: repliesLength.docs.length}
        })
      }
      res = {user: currProfile, posts: posts}

    } else if (tab === "replies") {

      const replies = [];
      if (profile.info.comments.length > last) {
      for (const replyID of profile.info.comments.slice(parseInt(last), parseInt(last) + 5)) {
        
        let originalPostPath = replyID.split("/")
        originalPostPath.pop()
        originalPostPath.pop()
        originalPostPath = originalPostPath.join("/")

        const originalPostRef = db.doc("posts/" + originalPostPath);
        const replyRef = db.doc("posts/" + replyID);

        const [originalPostSnapshot, replySnapshot] = await Promise.all([
          originalPostRef.get(),
          replyRef.get(),
        ]);

        if (replySnapshot.exists) {
          const repliesLengthRef = db.collection("posts/" + replyID + "/replies");
          const originalPostExists = originalPostSnapshot.exists;
          const user = originalPostExists ? await getUser(undefined, undefined, originalPostSnapshot.data().userId) : null;
          const repliesLength2Ref = originalPostExists ? db.collection("posts/" + originalPostPath + "/replies") : null;

          const [repliesLengthSnapshot, repliesLength2Snapshot] = await Promise.all([
            repliesLengthRef.get(),
            originalPostExists ? repliesLength2Ref.get() : null,
          ]);

          replies.push({
            replyPost: {
              postPath: replyID,
              post: {
                ...replySnapshot.data(),
                comments: repliesLengthSnapshot.docs.length,
              },
            },
            mainPost: originalPostExists
              ? {
                  postPath: originalPostPath,
                  user: user,
                  post: {
                    ...originalPostSnapshot.data(),
                    comments: repliesLength2Snapshot.docs.length,
                  },
                }
              : "Deleted",
          });
        }
      }
    }
      res = {user: currProfile, posts: replies};
    } else if (tab === "profile") {
      const coll = db.collection("posts")
        if (last === undefined) {
          // Query to retrieve the first 10 documents in the collection
          var postSnapshot = await coll.orderBy("postedAt", "desc").where("userId", "==", currProfile).limit(5).get()
        } else {
          // Query to retrieve the next 10 documents in the collection starting from the 'last' parameter
          const lastDoc = await coll.doc(last).get();
          var postSnapshot = await coll.orderBy("postedAt", "desc").where("userId", "==", currProfile).startAfter(lastDoc).limit(5).get()
        }

        const posts = []
        for (const post of postSnapshot.docs) {
          const repliesLength = await db.collection("posts/"+post.id+"/replies").get()
          posts.push({
            postPath: post.id,
            post: {...post.data(), comments: repliesLength.docs.length}
          })
        }

        res = {
          user: currProfile,
          posts: posts
        };
    } 
  } else {
    // The 'last' parameter is the last document that was retrieved
    if (last === undefined) {
      // Query to retrieve the first 10 documents in the collection
      var postsCol = await db.collection("posts").orderBy("postedAt", "desc").limit(10).get();
    } else {
      // Query to retrieve the next 10 documents in the collection starting from the 'last' parameter
      const lastDoc = await db.collection("posts").doc(last).get();
      var postsCol = await db.collection("posts").orderBy("postedAt", "desc").startAfter(lastDoc).limit(10).get();
    }

    const posts = [];

    for (const document of postsCol.docs) {
      if (posts.find(post => post.user.id === document.data().userId) === undefined) {
        var userProfile = await getUser(undefined, undefined, document.data().userId);
      } else {
        var userProfile = {id: document.data().userId}
      }
      
      const repliesLength = await db.collection("posts/"+document.id+"/replies").get()
      posts.push({
        postPath: document.id,
        user: userProfile,
        post: {...document.data(), comments: repliesLength.docs.length}
      });
    }

    res = posts;
  }
  return res;
}

async function getFollowingPosts(token, last) {
const profile = await getUser(undefined, token, undefined)
var res;

if (profile.success !== false) {
  if (profile.info.following.length > 0) {
    if (last === undefined) {
      // Query to retrieve the first 10 documents in the collection
      var followingPosts = await db.collection("posts").orderBy("postedAt", "desc").where("userId", "in", profile.info.following).limit(15).get()
    } else {
      // Query to retrieve the next 10 documents in the collection starting from the 'last' parameter
      const lastDoc = await db.collection("posts").doc(last).get();
      var followingPosts = await db.collection("posts").orderBy("postedAt", "desc").where("userId", "in", profile.info.following).startAfter(lastDoc).limit(15).get()
    }

    const followings = [];

    for (const document of followingPosts.docs) {

      const userProfile = await getUser(undefined, undefined, document.data().userId);
      const repliesLength = await db.collection("posts/"+document.id+"/replies").get()

      followings.push({
        postPath: document.id,
        user: userProfile,
        post: {...document.data(), comments:  repliesLength.docs.length}
      });
    }

    res = followings;
  } else {
    res = []
  }
} else {
  res = response(false, "An error has occured")
}

return res
}

// Function to fetch a single post
async function getPost(postId) {
  const postIdArray = postId.split("/")
  if (postIdArray.length % 2 !== 0) {
    // Retrieve post with passed id
    const postExist = await db.doc("posts/"+postId).get();

    // Checks if post exists
    if (postExist.exists) {
      const repliesLength = await db.collection("posts/"+postId+"/replies").get()
      res = {
        postPath: postId,
        post: {...postExist.data(), comments: repliesLength.docs.length}
      };
    } else {
      res = response(false, "No post found with that id!")
    }
  } else {
    res = response(false, "No post found with that id!")
  }

  return res
}

// Function for deleting a post
async function deletePost(id, token) {
if (token !== undefined) {
  const currUser = await getUserId(token);

  // Retrieve and check if the post to delete exists
  const post = await getPost(id);
  if (post.hasOwnProperty("post")) {

    // Check if logged user has the permission to delete the post
    if (currUser === post.post.userId) {
      cleanLikes(id)
      cleanReplies(currUser, id)
      await db.doc("posts/"+ id).delete();
      res = response(true, "Post deleted successfully!")
    } else {
      res = response(false, "Missing required permission for this action!")
    }
  } else {
      res = response(false, "No post found with that id!")
  }
} else {
  res = response(false, "You need to be logged in to perform this action!")
}
return res;
}

// Function to update the post's likes
async function updateLikes(path, token) {
if (token !== undefined) {
  const currUser = await getUserId(token);
  if (currUser.success !== false) {
    const userRef = db.doc("users/"+currUser)
    const userDoc = await userRef.get()
    const user = userDoc.data()

    const postRef = db.doc("posts/"+path)

    if (user.likes.includes(path)) {
      postRef.update({
        likes: firestore.FieldValue.increment(-1)
      })
      userRef.update({
        likes: firestore.FieldValue.arrayRemove(path)
      })
    } else {
      postRef.update({
        likes: firestore.FieldValue.increment(1)
      })
      userRef.update({
        likes: firestore.FieldValue.arrayUnion(path)
      })
    }


    return response(true)
  } else {
    return response(false, "An error has occured!")
  }
}
}

// Function to add replies
async function postReply(id, reply, token, images) {
if (token !== undefined) {
  // Retrieve and check if the post to delete exists
  const post = await db.doc("posts/"+id).get()
  if (post.exists) {
      const newReply = await addPost(reply, token, images, id)
      res = {...newReply.post, postPath: id+"/replies/"+newReply.post.postPath}

  } else {
    res = response(false, "No post found with that id!")
  }
} else {
  res = response(false, "You need to be logged in to perform this action!")
}
return res;
}

// Function to get replies of a post
async function getComments(last, postId) {
  // Retrieve post with passed id
  const q = db.collection("posts/"+ postId +"/replies").orderBy("postedAt", "asc").limit(15)
  const replies = await q.get();
  
  const comments = []
  for (const doc of replies.docs) {
    const data = doc.data()
    const repliesLength = await db.collection("posts/"+doc.id+"/replies").get()
    const user  = await getUser(undefined, undefined, data.userId)
    if (comments.find(comment => comment.post.userId === user.id)) {
      comments.push(
        {
          postPath: (postId+"/replies/"+doc.id),
          post: {...data, comments: repliesLength.docs.length}
        }
      )
    } else {
      comments.push(
        {
          user: user,
          postPath: (postId+"/replies/"+doc.id),
          post: {...data, comments: repliesLength.docs.length}
        }
      )
    }
  }

  res = {
    postPath: postId,
    replies: comments.reverse()
  };

return res;
}

// Export the functions for external use
module.exports = {
addPost,
getPosts,
getPost,
deletePost,
updateLikes,
postReply,
getComments,
getFollowingPosts
};
