require("dotenv").config(); // Load environment variables
const express = require("express");
const QRCode = require("qrcode");
const bodyParser = require("body-parser");
const cloudinary = require("cloudinary").v2;
const { createClient } = require("@supabase/supabase-js");
const multer = require("multer");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files from the public directory

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Supabase configuration
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve the QR code generation page
app.get("/generate", (req, res) => {
  res.sendFile(__dirname + '/public/generate.html');
});

// Endpoint to generate QR Code with link to image upload page
app.get("/generate-qr", async (req, res) => {
  try {
    const uploadLink = `${req.protocol}://${req.get("host")}/upload`;
    const qr = await QRCode.toDataURL(uploadLink);
    res.status(200).send(`<img src="${qr}" alt="Scan to upload image" />`);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Serve the upload HTML page
app.get("/upload", (req, res) => {
  res.sendFile(__dirname + '/public/upload.html');
});

// Publicly accessible endpoint to upload image to Cloudinary and store metadata in Supabase
app.post("/upload", upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    // Upload the image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload_stream(
      { folder: "qr_uploads" },
      async (error, result) => {
        if (error) return res.status(500).json({ error: "Image upload failed" });

        // Insert image URL into Supabase database
        const { data, error: dbError } = await supabase
          .from("images")
          .insert([{ url: result.secure_url, created_at: new Date() }]);

        if (dbError) throw dbError;

        res.status(200).json({ message: "Image uploaded successfully", data });
      }
    ).end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: "Image upload failed" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000; // Use Render's PORT or default to 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
