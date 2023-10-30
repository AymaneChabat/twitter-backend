const express = require("express");
const router = express.Router();
const {
    createChat,
    getChats,
    deleteChat,
    sendMessage,
    retrieveMessages,
    checkChat
} = require('../functions/chats'); // Import chat-related functions

// Route to get chats
router.post('/api/chats', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const last = req.body.last; // Extract the 'last' property from the request body

    // Call the getChats function to retrieve chats based on the authorization token and 'last'
    const chats = await getChats(last, token);

    // Send the chat data as a JSON response
    res.json(chats);
});

// Route to check if chat exists already
router.get('/api/chat/', async (req, res) => {
    const token = req.headers["authorization"]
    const participant = req.query.participant

    const chat = await checkChat(token, participant)

    res.json(chat)
})

// Route to create a new chat
router.post('/api/chat', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const userId = req.body.userId; // Extract the 'userId' property from the request body

    // Call the createChat function to create a new chat based on the authorization token and 'userId'
    const newChat = await createChat(userId, token);

    // Send the response as JSON
    res.json(newChat);
});

// Route to delete a chat
router.delete('/api/chats', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const id = req.body.chatId; // Extract the 'chatId' property from the request body

    // Call the deleteChat function to delete a chat based on the authorization token and 'chatId'
    const deleted = await deleteChat(id, token);

    // Send the response as JSON
    res.json(deleted);
});

// Route to send a message
router.post('/api/message', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const message = req.body; // Extract the message data from the request body

    // Call the sendMessage function to send a message based on the authorization token and message data
    const sentMessage = await sendMessage(message, token);

    // Send the response as JSON
    res.json(sentMessage);
});

// Route to retrieve messages
router.get('/api/message', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const chat = req.query.chat; // Extract the 'chat' query parameter

    // Call the retrieveMessages function to retrieve messages based on the authorization token and 'chat'
    const messages = await retrieveMessages(chat, token);

    // Send the messages as a JSON response
    res.json(messages);
});

module.exports = router;
