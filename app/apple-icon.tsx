import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// No border-radius here on purpose: iOS applies its own rounded-corner mask
// to home screen icons, so a pre-rounded icon would show a visible double edge.
export default async function AppleIcon() {
  const fontData = await readFile(join(process.cwd(), "app/assets/inter-bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
        }}
      >
        <span style={{ fontSize: 96, color: "#ffffff", fontFamily: "Inter" }}>B</span>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }],
    }
  );
}
