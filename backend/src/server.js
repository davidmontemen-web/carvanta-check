const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const routes = require("./routes/index");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", routes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Carvanta Check API running on port ${PORT}`);
});