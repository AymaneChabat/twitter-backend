const express = require("express")
const app = express();
var cors = require('cors');
const port = process.env.PORT || 9001;
const postRoutes = require("./routes/post")
const userRoutes = require("./routes/users")
const authRoutes = require("./routes/authentication")
const chatRoutes = require("./routes/chats")

// We add cross origin to only accept request from allowed origins
const allowlist = ['http://localhost:3000', 'https://twitter-clone-git-master-aymanechabat.vercel.app', 'https://x-clone-git-master-aymanechabat.vercel.app', 'https://x-clone-53koi5oan-aymanechabat.vercel.app', 'https://twitter-clone-eight-ashen.vercel.app']
const corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (allowlist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}

app.use(cors(corsOptionsDelegate))

app.use(express.json());

app.use('/', postRoutes)
app.use('/', userRoutes)
app.use('/', authRoutes)
app.use('/', chatRoutes)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
