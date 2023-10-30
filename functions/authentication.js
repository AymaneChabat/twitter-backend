const {
    getAuth
} = require("firebase-admin/auth"); // Import Firebase Authentication related functions

// Create an instance of Firebase Authentication
const auth = getAuth();

// Define a utility function for creating a response object
const response = (success, message) => {
    return {
        success: success,
        message: message
    };
};

// Function for sending a password reset email
async function passwordReset(email) {
    // Check if 'email' is of type string
    if (typeof email === "string") {
        return await auth.generatePasswordResetLink(email)
            .then(() => {
                // Return a success response if the email is sent successfully
                return {
                    status: response(true, "Password reset email has been sent to your inbox!")
                };
            })
            .catch((error) => {
                // Return an error response if sending the email fails
                return {
                    status: response(false, error.message)
                };
            });
    } else {
        // Return an error response if 'email' is not of type string
        return {
            status: response(false, "Email doesn't have the valid type!")
        };
    }
}

// Export the functions for external use
module.exports = {
    passwordReset
};
