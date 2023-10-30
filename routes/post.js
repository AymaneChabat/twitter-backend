const express = require("express");
const router = express.Router();
const multer = require("multer")
const {
    getPosts,
    addPost,
    deletePost,
    updateLikes,
    postReply,
    getComments,
    getPost,
    getFollowingPosts
} = require("../functions/post"); // Import post-related functions

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// Route to get posts
router.get('/api/post', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const last = req.query.last; // Extract the 'last' query parameter
    const tab = req.query.tab; // Extract the 'tab' query parameter
    const postId = req.query.post; // Extract the 'post' query parameter
    const username = req.query.username; // Extract the 'username' query parameter

    let postsList;


    if (postId !== undefined) {
        postsList = await getPost(postId)
    } else if (tab === "following") {
        postsList = await getFollowingPosts(token, last)
    } else {
        postsList = await getPosts(last, tab, username);
    }

    // Send the post data as a JSON response
    res.json(postsList);
});

// Route to add a new post
router.post('/api/post', upload.array("images", 4), async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const postData = req.body; // Extract the post data from the request body
    const images = req.files

    // Call the addPost function to add a new post
    const post = await addPost(postData, token, images);

    // Send the response as JSON
    res.json(post);
});

// Route to delete a post
router.delete('/api/post', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const postId = req.body.id; // Extract the post ID from the request body

    // Call the deletePost function to delete a post
    const post = await deletePost(postId, token);

    // Send the response as JSON
    res.json(post);
});

// Route to update likes
router.put('/api/post/*', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const postPath = req.params["0"]; // Extract the post ID from the request body

    // Call the deletePost function to delete a post
    const post = await updateLikes(postPath, token);

    // Send the response as JSON
    res.json(post);
});

router.post('/api/:username/post/*', upload.array("images", 4), async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers
    const postId = req.params["0"]; // Extract the post ID from the request body
    const username = req.params.username
    const images = req.files
    const postData = req.body;

    // Call the deletePost function to delete a post
    const post = await postReply(postId, postData, token, images, username)

    // Send the response as JSON
    res.json(post);
});

router.get('/api/:username/replies/*', async (req, res) => {
    const postId = req.params[0]; // Extract the post ID from the request body

    // Call the deletePost function to delete a post
    const replies = await getComments(undefined, postId)

    // Send the response as JSON
    res.json(replies);
});

module.exports = router;
