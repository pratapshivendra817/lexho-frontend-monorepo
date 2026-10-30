import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { api } from "@/api/axios";

type Link = {
  id: number;
  platform: string;
  url: string;
  label: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
};

type LinkForm = Omit<Link, "id">;

const blank: LinkForm = {
  platform: "INSTAGRAM",
  url: "",
  label: "Instagram",
  icon: "instagram",
  displayOrder: 1,
  isActive: true,
};

function getLinks(value: unknown): Link[] {
  if (Array.isArray(value)) return value as Link[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of ["content", "items", "results", "links", "socialMedia", "data"]) {
    const links = getLinks(record[key]);
    if (links.length || Array.isArray(record[key])) return links;
  }

  return [];
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  const markdownMatch = trimmed.match(/\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);
  const urlMatch = (markdownMatch?.[1] ?? trimmed.match(/https?:\/\/[^\s\]"',]+/i)?.[0] ?? trimmed)
    .replace(/[),.;]+$/, "");

  try {
    const parsed = new URL(urlMatch);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const response = error.response?.data as { message?: string } | undefined;
    return response?.message ?? "Unable to save the social media link.";
  }

  return "Unable to complete that request.";
}

export default function SocialMediaPage() {
  const [links, setLinks] = useState<Link[]>([]);
  const [form, setForm] = useState<LinkForm>(blank);
  const [editing, setEditing] = useState<Link | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const { data } = await api.get("/api/admin/social-media", { params: { page: 0, size: 50 } });
      setLinks(getLinks(data).sort((first, second) => first.displayOrder - second.displayOrder));
    } catch (requestError) {
      setLinks([]);
      setError(getErrorMessage(requestError));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const url = normalizeUrl(form.url);
    if (!url) {
      setError("Enter a valid URL, for example https://www.facebook.com/your-page.");
      return;
    }

    const displayOrder = Number(form.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 1) {
      setError("Display order must be a whole number of at least 1.");
      return;
    }

    const payload: LinkForm = {
      ...form,
      platform: form.platform.trim().toUpperCase(),
      url,
      label: form.label.trim(),
      icon: form.icon?.trim(),
      displayOrder,
    };

    try {
      setError("");
      if (editing) await api.put(`/api/admin/social-media/${editing.id}`, payload);
      else await api.post("/api/admin/social-media", payload);
      setForm(blank);
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const toggle = async (link: Link) => {
    try {
      setError("");
      await api.patch(`/api/admin/social-media/${link.id}/status`, { isActive: !link.isActive });
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this social link?")) return;

    try {
      setError("");
      await api.delete(`/api/admin/social-media/${id}`);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Social Media</h2>
        <p className="text-sm text-[var(--color-muted)]">Manage the public website footer links.</p>
      </div>

      {error ? <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead>
            <tr>{["Platform", "URL", "Label", "Order", "Status", "Actions"].map((label) => <th className="p-3 text-left" key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr className="border-t" key={link.id}>
                <td className="p-3">{link.platform}</td>
                <td className="p-3 max-w-xs truncate">{link.url}</td>
                <td className="p-3">{link.label}</td>
                <td className="p-3">{link.displayOrder}</td>
                <td className="p-3">{link.isActive ? "Active" : "Inactive"}</td>
                <td className="flex gap-2 p-3">
                  <button className="underline" onClick={() => { setEditing(link); setForm({ ...link }); }}>Edit</button>
                  <button className="underline" onClick={() => void toggle(link)}>{link.isActive ? "Disable" : "Enable"}</button>
                  <button className="text-red-500" onClick={() => void remove(link.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={(event) => void save(event)} className="max-w-lg space-y-3 rounded-xl border p-4">
        <h3 className="font-semibold">{editing ? "Edit link" : "Add link"}</h3>
        {(["platform", "url", "label", "icon", "displayOrder"] as const).map((key) => (
          <label className="block text-sm" key={key}>
            {key}
            <input
              required
              type={key === "displayOrder" ? "number" : "text"}
              min={key === "displayOrder" ? 1 : undefined}
              value={form[key]}
              onChange={(event) => setForm((previous) => ({ ...previous, [key]: key === "displayOrder" ? Number(event.target.value) : event.target.value }))}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
        ))}
        <label className="flex gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))} /> Active</label>
        <button className="rounded bg-emerald-600 px-3 py-2 text-white">Save</button>
      </form>
    </div>
  );
}
