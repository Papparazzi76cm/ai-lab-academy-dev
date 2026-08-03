import QRCode from "qrcode";
import { getPublicVerificationUrl } from "./certificate-number";

export async function generateVerificationQrDataUrl(
  verificationCode: string,
  origin?: string,
): Promise<string> {
  const url = getPublicVerificationUrl(verificationCode, origin);
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 256,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
    return dataUrl;
  } catch (error) {
    console.error("Error al generar código QR:", error);
    throw new Error("No se pudo generar el código QR de verificación");
  }
}
