// Import necessary modules and functions
const {
  getUserId
} = require("../config"); // Import your custom configuration and getUserId function
const {
  getFirestore
} = require('firebase-admin/firestore'); // Import Firebase Firestore related functions
const { getUser } = require("./users")

// Create an instance of Firebase Firestore
const db = getFirestore();

// Define a utility function for creating a response object
const response = (success, message) => {
  return {
    success: success,
    message: message
  };
};

// Function for creating a chat
async function createChat(userId, token) {
  if (token !== undefined) {
    const currUser = await getUserId(token);

    // Verifying if chat already exists between current user and the other one
    const chats = db.collection("chats");

    const chatSnapshot = (await chats.where("participants", "in", [
      [currUser, userId],
      [userId, currUser]
    ]).get()).docs;

    if (chatSnapshot.length === 0) {
      // Create a new chat if it doesn't exist
      const newChat = await chats.add({
        participants: [currUser, userId],
        updatedAt: Date.now()
      });

      return {
        status: response(true, "Chat has been created!"),
        chat: {
          chat: {
            participants: [currUser, userId],
            updatedAt: Date.now()
          },
          id: newChat.id
        }
      };
    } else {
      const chats = [];
      chatSnapshot.forEach((chat) => {
        chats.push(chat);
      });

      return {
        status: response(false, "Chat already exists!"),
        chat: {
          chat: chats[0].data(),
          id: chats[0].id
        }
      };
    }
  } else {
    return {
      status: response(false, "You need to be logged in to perform this action!")
    };
  }
}

// Function for retrieving chats
async function getChats(last, token) {
  if (token !== undefined) {
    const currUser = await getUserId(token);

    // Define the initial query
    let chats;
    if (last === undefined) {
      chats = db.collection("chats").where("participants", "array-contains", currUser).orderBy("updatedAt", "desc").limit(10);
    } else {
      const lastDoc = await db.collection("chats").doc(last).get();
      chats = db.collection("chats").where("participants", "array-contains", currUser).orderBy("updatedAt", "desc").startAfter(lastDoc).limit(10);
    }

    // Retrieve the chats
    var chatList = [];
    const chatSnapshot = await chats.get();
    for (const document of chatSnapshot.docs) {
      const userId = document.data().participants[0] === currUser ? document.data().participants[1] : document.data().participants[0];
      const user = await getUser(undefined, undefined, userId, false)
      chatList.push({
        user: user,
        chat: document.data(),
        id: document.id
      });
    }

    // Determine the last document for pagination
    const newLastDoc = chatSnapshot.docs[chatSnapshot.docs.length - 1];
    if (newLastDoc !== undefined) {
      chatList = [chatList, newLastDoc.id];
    } else {
      chatList = [chatList, null];
    }
  } else {
    chatList = {
      status: response(false, "You need to be logged in to perform this action!")
    };
  }

  return chatList;
}

// Function to check if a chat exists between the participants
async function checkChat(token, participant) {
  if (token !== undefined) {
    const currUser = await getUserId(token)
    if (currUser.success !== false) {
      const coll = db.collection("chats")
      const chat1 = await coll.where("participants", "==", [participant, currUser]).get()
      const chat2 = await coll.where("participants", "==", [currUser, participant]).get()
      const mergedResults = [...chat1.docs, ...chat2.docs]
      const chat =  mergedResults.map((chat)=>{
        return {
        id: chat.id,
        chat: chat.data()
      }})
      if (chat.length > 0) {
        return chat[0]
      } else {
        return response(false, "No chat has been found!")
      }
    } else {
      return response(false, "User is not authenticated!")
    }
  } else {
    return response(false, "An error has occured!")
  }
}

// Function for deleting a chat
async function deleteChat(id, token) {
  if (token !== undefined) {
    const currUser = await getUserId(token);

    // Retrieve and check if the chat exists
    const chatRef = db.collection("chats").doc(id);
    const chatSnapshot = await chatRef.get();

    if (chatSnapshot.exists) {
      const permission = await chatSnapshot.data().participants;

      // Check if the logged user has permission to delete the chat
      if (permission.includes(currUser)) {
        await chatRef.delete();
        return response(true, "Chat deleted successfully!")
      } else {
        return response(false, "Missing required permission for this action!")
      }
    } else {
      return response(false, "No chat found with that ID!")
    }
  } else {
    return response(false, "You need to be logged in to perform this action!")
  }
}

// Function for sending a message
async function sendMessage(data, token) {
  if (token !== undefined) {
    const currUser = await getUserId(token);

    if (typeof (data.media) === "object" && typeof (data.content) === "string") {
      // Pass the values to a new object to get rid of any additional keys
      const newDocument = {
        sender: currUser,
        sentAt: Date.now(),
        content: data.content,
        media: data.media
      };

      // Add the new message to the chat's messages collection
      const docId = await db.collection("chats/"+data.chat+"/messages").add(newDocument);
      await db.collection("chats").doc(data.chat).update({
        updatedAt: Date.now()
      });

      return {
        status: response(true, "Message has been sent successfully!"),
        message: {
          message: newDocument,
          id: docId.id
        }
      };
    } else {
      return response(false, "An error has occurred!")
    }
  } else {
    return response(false, "You need to be logged in to perform this action!")
  }
}

// Function for retrieving messages from a chat
async function retrieveMessages(chat, token) {
  if (token !== undefined) {
    const currUser = await getUserId(token);
    const chatSnap = await db.collection("chats").doc(chat).get();

    var chatList = {};
    if (chatSnap.exists) {
      if (chatSnap.data().participants.includes(currUser)) {
        // Query messages collection and order by sentAt
        const messagesSnapshot = await db.collection("chats/"+chat+"/messages").orderBy("sentAt", "asc").get();
        const messagesMap = messagesSnapshot.docs.map(doc => {
          return ({
            message: doc.data(),
            id: doc.id
          });
        });
        chatList = {
          status: response(true, "Messages have been successfully retrieved!"),
          messages: messagesMap
        };
      } else {
        chatList = response(false, "You are not allowed to access this conversation!")
      }
    } else {
      chatList = response(false, "No chat has been found with this ID!")
    }
  }
  return chatList;
}

// Export the functions for external use
module.exports = {
  createChat,
  getChats,
  deleteChat,
  sendMessage,
  retrieveMessages,
  checkChat
};
