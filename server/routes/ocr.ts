import type { RequestHandler } from "express";

// OCR API endpoint using the provided API key
const OCR_API_URL = "https://api.ocr.space/parse/image";

export const handleOCR: RequestHandler = async (req, res) => {
  try {
    const apiKey = process.env.OCR_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Server is missing OCR_API_KEY" });
      return;
    }

    const { image, language = "eng" } = req.body;
    
    if (!image) {
      res.status(400).json({ error: "Missing image data" });
      return;
    }

    // Convert data URL to base64 if needed
    let base64Image = image;
    if (image.startsWith('data:image/')) {
      base64Image = image.split(',')[1];
    }

    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('base64Image', `data:image/png;base64,${base64Image}`);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      res.status(502).json({ error: "OCR service error", status: response.status });
      return;
    }

    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
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

    res.json({ 
      text: extractedText,
      confidence: data.ParsedResults?.[0]?.TextOverlay?.Lines?.length || 0,
      language: language
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: "Unexpected server error" });
  }
};
