import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { predictImage } from "@/lib/ml/predict";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
]);

export async function POST(req: Request) {
  // 1. Auth gate
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Parse multipart
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1e6).toFixed(1)} MB, max 10 MB)` },
      { status: 413 }
    );
  }

  // 3. Forward to FastAPI backend
  try {
    const prediction = await predictImage(file, file.name || "upload.jpg");
    return NextResponse.json(prediction);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ML inference failed";
    // Distinguish "backend unreachable" from upstream HTTP errors
    const unreachable = /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(msg);
    return NextResponse.json(
      {
        error: unreachable
          ? "ML backend is not reachable. Check that the FastAPI server is running on ML_API_URL."
          : msg,
      },
      { status: unreachable ? 503 : 502 }
    );
  }
}
