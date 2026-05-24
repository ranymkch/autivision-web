"use client";

import { useState, useTransition } from "react";
import { Edit2, Save, X, StickyNote, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { updatePatientNotes } from "../actions";

interface Props {
  patientId: string;
  initialNotes: string | null;
}

export function ClinicalNotesClient({ patientId, initialNotes }: Props) {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes ?? "");
  const [saving, startSaving] = useTransition();

  function handleEdit() {
    setDraft(notes);
    setEditing(true);
  }

  function handleCancel() {
    setDraft(notes);
    setEditing(false);
  }

  function handleSave() {
    startSaving(async () => {
      const res = await updatePatientNotes(patientId, draft || null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setNotes(draft);
      setEditing(false);
      toast.success(isFr ? "Notes enregistrées." : "Notes saved.");
    });
  }

  function handleDelete() {
    if (!confirm(isFr ? "Supprimer les notes cliniques ?" : "Delete clinical notes?")) return;
    startSaving(async () => {
      const res = await updatePatientNotes(patientId, null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setNotes("");
      setDraft("");
      setEditing(false);
      toast.success(isFr ? "Notes supprimées." : "Notes deleted.");
    });
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <StickyNote className="h-4 w-4 text-primary" />
            {isFr ? "Notes cliniques" : "Clinical notes"}
          </h2>
          {!editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit2 className="h-3.5 w-3.5" />
                {notes ? (isFr ? "Modifier" : "Edit") : (isFr ? "Ajouter" : "Add")}
              </Button>
              {notes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <X className="h-3.5 w-3.5" />
                  {isFr ? "Supprimer" : "Delete"}
                </Button>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder={isFr ? "Saisissez vos notes cliniques…" : "Enter clinical notes…"}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="h-3.5 w-3.5" />
                {isFr ? "Annuler" : "Cancel"}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5" />
                {saving ? (isFr ? "Enregistrement…" : "Saving…") : (isFr ? "Enregistrer" : "Save")}
              </Button>
            </div>
          </div>
        ) : notes ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">{notes}</p>
        ) : (
          <button
            type="button"
            onClick={handleEdit}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            {isFr ? "Ajouter des notes cliniques" : "Add clinical notes"}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
