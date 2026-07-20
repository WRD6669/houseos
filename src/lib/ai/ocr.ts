import { createWorker } from "tesseract.js";

/**
 * Extract text from an image file using Tesseract.js OCR.
 * Supports png, jpg, jpeg formats.
 *
 * @param file - The image File object from an <input type="file">
 * @returns Recognized text string
 * @throws If OCR processing fails
 */
export async function extractTextFromImage(file: File): Promise<string> {
  const worker = await createWorker("chi_sim+eng");

  try {
    const imageUrl = URL.createObjectURL(file);
    const { data } = await worker.recognize(imageUrl);
    URL.revokeObjectURL(imageUrl);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
