const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    getUsers,
    updateUser,
    createUser,
    followersUpdate,
    updateUsername,
    getUser
} = require("../functions/users"); // Import user-related functions

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to get user data
router.get('/api/users', async (req, res) => {
    const username = req.query.username; // Extract the 'username' query parameter
    const limit = req.query.limit;
    const last = req.query.last === undefined ? undefined : req.query.last 

    // Call the getUsers function to retrieve user data based on the query parameters
    const users = await getUsers(username, limit, last);

    // Send the user data as a JSON response
    res.json(users);
});

router.get('/api/user/:username', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const username = req.params.username; // Extract the 'username' query parameter

    // Call the getUsers function to retrieve user data based on the query parameters
    const users = await getUser(username, token, undefined, false);

    // Send the user data as a JSON response
    res.json(users);
});

// Route to create a new user
router.post('/api/user', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const initialData = req.body; // Extract the user data from the request body

    // Call the createUser function to create a new user
    const user = await createUser(initialData, token);

    // Send the response as JSON
    res.json(user);
});

// Route to create a new user
router.post('/api/follow/', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const user = req.query.username; // Extract the user data from the request body

    // Call the createUser function to create a new user
    const response = await followersUpdate(token, user);

    // Send the response as JSON
    res.json(response);
});

// Route to update user information
router.put('/api/user', upload.fields([{name:"banner"}, {name:"profilepicture"}]), async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const updatedData = req.body; // Extract the updated user data from the request body
    const banner = req.files["banner"]
    const pp = req.files["profilepicture"]

    // Call the function to update the user's information
    if (updatedData.username !== undefined) {
        var user = await updateUsername(updatedData.username, token)
    } else {
        var user = await updateUser(updatedData, token, banner, pp);
    }
    

    // Send the response as JSON
    res.json(user);
});

module.exports = router;
