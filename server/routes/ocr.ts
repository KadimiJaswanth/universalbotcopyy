import type { RequestHandler } from "express";

// OCR API endpoint using the provided API key
const OCR_API_URL = "https://api.ocr.space/parse/image";

export const handleOCR: RequestHandler = async (req, res) => {
  try {
    const apiKey = process.env.OCR_API_KEY;
    console.log('OCR API Key available:', !!apiKey);

    if (!apiKey) {
      res.status(500).json({ error: "Server is missing OCR_API_KEY" });
      return;
    }

    const { image, language = "eng" } = req.body;

    if (!image) {
      res.status(400).json({ error: "Missing image data" });
      return;
    }

    console.log('OCR Request - Language:', language, 'Image size:', image.length);

    // Use the image directly if it's already a data URL
    let imageData = image;
    if (!image.startsWith('data:image/')) {
      imageData = `data:image/jpeg;base64,${image}`;
    }

    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('base64Image', imageData);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

    console.log('Sending OCR request to:', OCR_API_URL);

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('OCR Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('OCR API Error:', response.status, errorText);
      res.status(502).json({
        error: "OCR service error",
        status: response.status,
        details: errorText
      });
      return;
    }

    const data = await response.json();
    console.log('OCR Response data:', JSON.stringify(data, null, 2));

    if (data.IsErroredOnProcessing) {
      console.error('OCR Processing Error:', data.ErrorMessage, data.ErrorDetails);
      res.status(400).json({
        error: "OCR processing failed",
        details: data.ErrorMessage || data.ErrorDetails
      });
      return;
    }

    // Extract text from all parsed results
    const extractedText = data.ParsedResults
      ?.map((result: any) => result.ParsedText)
      .join('\n')
      .trim() || '';

    console.log('Extracted text:', extractedText);

    res.json({
      text: extractedText,
      confidence: data.ParsedResults?.[0]?.TextOverlay?.Lines?.length || 0,
      language: language
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: "Unexpected server error", details: error.message });
  }
};
