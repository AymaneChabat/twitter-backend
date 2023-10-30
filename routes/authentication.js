const express = require("express");
const router = express.Router();
const {
    passwordReset
} = require('../functions/authentication'); // Import authentication-related functions

// Route to delete a user account
router.delete('/api/auth/user', async (req, res) => {
    const token = req.headers["authorization"]; // Extract the authorization token from headers

    // Call the deleteAccount function to delete the user account based on the authorization token
    const authenticationResult = await deleteAccount(token);

    // Send the authentication result as a JSON response
    res.json(authenticationResult);
});

// Route to initiate a password reset
router.post('/api/passwordReset', async (req, res) => {
    const email = req.body.email; // Extract the 'email' property from the request body

    // Call the passwordReset function to initiate a password reset based on the provided email
    const authenticationResult = await passwordReset(email);

    // Send the authentication result as a JSON response
    res.json(authenticationResult);
});

module.exports = router;
