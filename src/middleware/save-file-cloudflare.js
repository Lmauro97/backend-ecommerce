import config from "./../config.js";
import AWS from "aws-sdk";

// Configura del cliente S3 compatible con R2
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(config.endpoint),
  accessKeyId: config.accessKeyId,
  secretAccessKey: config.secretAccessKey,
  signatureVersion: "v4",
  s3ForcePathStyle: true,
  region: "auto",
});

export const cloudflareMiddleware = {
  s3,
};
