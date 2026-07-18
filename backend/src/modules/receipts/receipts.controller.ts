import { Request, Response } from "express";
import multer from "multer";
import Groq from "groq-sdk";
import { config } from "../../config";
import { sendSuccess, sendError } from "../../utils/response";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Hanya file gambar yang diperbolehkan"));
  },
});

export const uploadMiddleware = upload.single("receipt");

const SCAN_PROMPT = `You are a financial assistant that extracts information from receipts. You must respond ONLY with a valid JSON object. Do not include any markdown formatting, backticks, or introduction text.

The output must strictly follow this JSON structure:
{
  "amount": 75000,
  "date": "2026-07-18",
  "description": "Beli kopi dan roti bakar",
  "merchant": "Kopi Kenangan",
  "categoryHint": "Makanan & Minuman"
}

JSON Rules:
1. "amount" must be a pure number representing the total paid (no currency symbols, no dots, no commas).
2. "date" must be in YYYY-MM-DD format, or null if completely unreadable.
3. "categoryHint" must strictly be one of these exact strings: 'Makanan & Minuman', 'Transportasi', 'Belanja', 'Kesehatan', 'Hiburan', 'Pendidikan', 'Tagihan', 'Lainnya'.
4. Ensure the output is a perfectly valid JSON object to satisfy the Groq response format validation.`;

export async function scanReceipt(req: Request, res: Response) {
  try {
    if (!req.file) {
      return sendError(res, "Tidak ada file yang diunggah", 400);
    }

    if (!config.groqApiKey) {
      return sendError(res, "Groq API key belum dikonfigurasi", 500);
    }

    const groq = new Groq({ apiKey: config.groqApiKey });

    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const response = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SCAN_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 512,
    });
    

    const text = response.choices[0]?.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return sendError(
        res,
        "Tidak dapat membaca struk. Pastikan gambar jelas dan cukup terang.",
        422,
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return sendSuccess(res, {
      amount:
        typeof parsed.amount === "number"
          ? parsed.amount
          : Number(String(parsed.amount).replace(/\D/g, "")),
      date: parsed.date ?? null,
      description: parsed.description ?? "",
      merchant: parsed.merchant ?? null,
      categoryHint: parsed.categoryHint ?? "Lainnya",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("rate_limit") || message.includes("Rate limit")) {
      return sendError(
        res,
        "Rate limit Groq API tercapai. Coba lagi beberapa saat.",
        429,
      );
    }
    if (
      message.includes("invalid_api_key") ||
      message.includes("Invalid API Key") ||
      message.includes("401")
    ) {
      return sendError(
        res,
        "Groq API key tidak valid. Perbarui GROQ_API_KEY di backend/.env.",
        401,
      );
    }
    if (
      message.includes("model_not_found") ||
      message.includes("does not exist")
    ) {
      return sendError(
        res,
        "Model Groq tidak ditemukan. Periksa nama model di controller.",
        502,
      );
    }

    return sendError(res, "Gagal memindai struk: " + message, 500);
  }
}
