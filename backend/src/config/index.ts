import "dotenv/config";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET harus diisi di file .env");
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptRounds: 12,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
  groqApiKey: process.env.GROQ_API_KEY || '',
};
