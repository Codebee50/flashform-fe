"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ApiError, errorMessage } from "@/lib/api";
import { toFormErrors, type FormErrors } from "@/lib/form-errors";
import { normalizeRoomCode, ROOM_CODE_PATTERN } from "@/lib/room-code";
import { roomsApi } from "@/lib/rooms-api";
import type { Room } from "@/lib/types";

const NAME_MAX = 100;

const CREATE_FIELDS = ["name", "code"] as const;
type CreateField = (typeof CREATE_FIELDS)[number];

export function CreateRoomDialog({
  onCreated,
  onClose,
}: {
  onCreated: (room: Room) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FormErrors<CreateField>>({ fields: {}, form: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    const custom = normalizeRoomCode(code);
    const missing: FormErrors<CreateField>["fields"] = {};
    if (!trimmed) missing.name = "Give the room a name.";
    if (custom && !ROOM_CODE_PATTERN.test(custom)) {
      missing.code = "Use 4 to 10 letters and numbers.";
    }
    if (Object.keys(missing).length) {
      setErrors({ fields: missing, form: null });
      return;
    }

    setPending(true);
    setErrors({ fields: {}, form: null });
    try {
      // Not idempotent: a retry after a lost response makes a second room, which the
      // teacher can delete. Rare enough not to guard against.
      onCreated(await roomsApi.create({ name: trimmed, code: custom || null }));
    } catch (error) {
      setErrors(toFormErrors(error, CREATE_FIELDS));
      setPending(false);
    }
  }

  return (
    <Dialog
      title="New room"
      description="Make one room per class. Students join it with its code."
      onClose={onClose}
      busy={pending}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="Name"
          name="name"
          placeholder="Period 3 Biology"
          autoComplete="off"
          maxLength={NAME_MAX}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.fields.name}
          autoFocus
          required
        />
        <Field
          label="Custom code (optional)"
          name="code"
          placeholder="BIO3"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={14}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          error={errors.fields.code}
          hint="4 to 10 letters and numbers. Leave it blank to get an easy-to-read code."
          inputClassName="font-mono uppercase tracking-code"
        />
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}
        <DialogActions>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating room…" : "Create room"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function RenameRoomDialog({
  room,
  onRenamed,
  onClose,
}: {
  room: Room;
  onRenamed: (room: Room) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FormErrors<"name">>({ fields: {}, form: null });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ fields: { name: "Give the room a name." }, form: null });
      return;
    }
    if (trimmed === room.name) {
      onClose();
      return;
    }

    setPending(true);
    setErrors({ fields: {}, form: null });
    try {
      onRenamed(await roomsApi.update(room.id, { name: trimmed }));
    } catch (error) {
      setErrors(toFormErrors(error, ["name"] as const));
      setPending(false);
    }
  }

  return (
    <Dialog title="Rename room" onClose={onClose} busy={pending}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field
          label="Name"
          name="name"
          autoComplete="off"
          maxLength={NAME_MAX}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.fields.name}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          required
        />
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}
        <DialogActions>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save name"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function DeleteRoomDialog({
  room,
  onDeleted,
  onClose,
}: {
  room: Room;
  onDeleted: (id: number) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await roomsApi.remove(room.id);
      onDeleted(room.id);
    } catch (err) {
      // 404: already gone (deleted in another tab, or an earlier attempt went through).
      if (err instanceof ApiError && err.status === 404) {
        onDeleted(room.id);
        return;
      }
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <Dialog
      title={`Delete ${room.name}?`}
      description="This removes the room and all its reports. It can't be undone."
      onClose={onClose}
      busy={pending}
    >
      {error && <Notice tone="danger">{error}</Notice>}
      <DialogActions>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void remove()} disabled={pending}>
          {pending ? "Deleting…" : "Delete room"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
