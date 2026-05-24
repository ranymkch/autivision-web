"use client";

interface PatientPhotoCellProps {
  photoUrl: string | null;
  initials: string;
}

export function PatientPhotoCell({ photoUrl, initials }: PatientPhotoCellProps) {
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (sib) sib.style.removeProperty("display");
          }}
        />
      ) : null}
      <div
        style={photoUrl ? { display: "none" } : undefined}
        className="flex h-full w-full items-center justify-center text-[10px] font-mono text-muted-foreground"
      >
        {initials}
      </div>
    </div>
  );
}
