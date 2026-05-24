"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/bmp";
const MAX_BYTES = 10 * 1024 * 1024;

export function ImageUploader({
  value,
  onChange,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
}) {
  const { t } = useI18n();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(file: File | null) {
    if (!file) {
      setPreview(null);
      onChange(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("File too large (max 10 MB).");
      return;
    }
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {preview && value ? (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="aspect-video w-full object-contain bg-secondary" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-3 top-3 rounded-full"
            onClick={() => handleFile(null)}
          >
            <X />
          </Button>
          <div className="flex items-center justify-between bg-card px-4 py-2 text-xs text-muted-foreground">
            <span className="truncate">{value.name}</span>
            <span>{(value.size / 1024).toFixed(0)} KB</span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ImagePlus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium">{t.app.screening.drop}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.app.screening.uploadHint}</p>
          </div>
        </button>
      )}
    </div>
  );
}
