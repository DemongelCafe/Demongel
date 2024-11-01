require("dotenv").config();
const express = require("express");
const QRCode = require("qrcode");
const bodyParser = require("body-parser");
const cloudinary = require("cloudinary").v2;
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Endpoint to generate QR Code
app.post("/generate-qr", async (req, res) => {
  const { data } = req.body;
  try {
    const qr = await QRCode.toDataURL(data);
    res.status(200).json({ qr });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Endpoint to upload image to Cloudinary and save metadata to Supabase
app.post("/upload-image", async (req, res) => {
  const { imageUrl } = req.body;

  try {
    const uploadResult = await cloudinary.uploader.upload(imageUrl, {
      folder: "qr_uploads",
    });

    const { data, error } = await supabase
      .from("images")
      .insert([{ url: uploadResult.secure_url, created_at: new Date() }]);

    if (error) throw error;
    res.status(200).json({ message: "Image uploaded successfully", data });
  } catch (error) {
    res.status(500).json({ error: "Image upload failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
