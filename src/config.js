import { config } from "dotenv";
config();

export default {
  host: process.env.HOST || "",
  port: process.env.PORTDB || "3306",
  database: process.env.DATABASE || "",
  user: process.env.USER || "",
  password: process.env.PASSWORD || "",
  accessToken: process.env.ACCESSTOKEN || "",
  accessToken_jwt: process.env.ACCESSTOKEN_JWT,
  accessResend: process.env.ACCESSTOKEN_RESEND,
  urlfrontend: process.env.URLFRONTEND || "",
  notification_url: process.env.NOTIFICATION_URL || "",
  endpoint: process.env.ENDPOINT,
  accessKeyId: process.env.ACCESSKEYID,
  secretAccessKey: process.env.SECRETACCESSKEY,
  bucket_name: process.env.BUCKET_NAME,
  rutaR2: process.env.RUTAR2,
};
