import type { RequestHandler } from "express";

// Google Vision API endpoint for OCR
const GOOGLE_VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

export const handleOCR: RequestHandler = async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log("Google API Key available:", !!apiKey);

    if (!apiKey) {
      res.status(500).json({ error: "Server is missing GOOGLE_API_KEY" });
      return;
    }

    const { image, language = "eng" } = req.body;

    if (!image) {
      res.status(400).json({ error: "Missing image data" });
      return;
    }

    console.log(
      "OCR Request - Language:",
      language,
      "Image size:",
      image.length,
    );

    // Extract base64 data from data URL
    let base64Image = image;
    if (image.startsWith("data:image/")) {
      base64Image = image.split(",")[1];
    }

    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: "TEXT_DETECTION",
              maxResults: 1,
            },
          ],
          imageContext: {
            languageHints: [language === "eng" ? "en" : language],
          },
        },
      ],
    };

    console.log("Sending OCR request to Google Vision API");

    const response = await fetch(`${GOOGLE_VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Google Vision Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Google Vision API Error:", response.status, errorText);
      res.status(502).json({
        error: "OCR service error",
        status: response.status,
        details: errorText,
      });
      return;
    }

    const data = await response.json();
    console.log("Google Vision Response:", JSON.stringify(data, null, 2));

    if (data.responses?.[0]?.error) {
      console.error("Google Vision Processing Error:", data.responses[0].error);
      res.status(400).json({
        error: "OCR processing failed",
        details: data.responses[0].error.message,
      });
      return;
    }

    // Extract text from Google Vision response
    const textAnnotations = data.responses?.[0]?.textAnnotations;
    const extractedText = textAnnotations?.[0]?.description?.trim() || "";

    console.log("Extracted text:", extractedText);

    res.json({
      text: extractedText,
      confidence: textAnnotations?.[0]?.score || 1,
      language: language,
    });
  } catch (error) {
    console.error("OCR Error:", error);
    res
      .status(500)
      .json({ error: "Unexpected server error", details: error.message });
  }
};
