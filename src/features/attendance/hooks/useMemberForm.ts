// 멤버 폼 관리 훅

import { useState } from "react";
import { createMember, updateMember, deleteBlob } from "../api";
import { ApiError } from "@/shared/utils/error";
import type { MemberFormState } from "../types";

const initialForm: MemberFormState = {
  mode: "create",
  open: false,
  memberId: undefined,
  name: "",
  phone: "",
  birthDateYmd: "",
  photoUrl: "",
};

export function useMemberForm() {
  const [form, setForm] = useState<MemberFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [tempUploadedUrls, setTempUploadedUrls] = useState<string[]>([]);

  function openCreate() {
    setError(null);
    setOriginalPhotoUrl(null);
    setTempUploadedUrls([]);
    setForm({
      ...initialForm,
      mode: "create",
      open: true,
    });
  }

  function openEdit(member: { id: string; name: string; phone: string; birthDate: string; photoUrl: string }) {
    setError(null);
    setOriginalPhotoUrl(member.photoUrl);
    setTempUploadedUrls([]);
    setForm({
      mode: "edit",
      open: true,
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      birthDateYmd: member.birthDate.split("T")[0],
      photoUrl: member.photoUrl,
    });
  }

  function close() {
    // 임시 업로드된 이미지 삭제
    if (tempUploadedUrls.length > 0) {
      Promise.all(tempUploadedUrls.map((u) => deleteBlob(u))).catch(() => {});
    }
    setTempUploadedUrls([]);
    setOriginalPhotoUrl(null);
    setError(null);
    setForm((p) => ({ ...p, open: false }));
  }

  function updateForm(updates: Partial<MemberFormState>) {
    setForm((p) => ({ ...p, ...updates }));
  }

  function addTempUrl(url: string) {
    setTempUploadedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }

  function validate(): string | null {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const birth = form.birthDateYmd.trim();
    const photo = form.photoUrl.trim();

    if (!name) return "이름은 필수입니다.";
    if (!phone) return "핸드폰 번호는 필수입니다.";
    if (!birth) return "생년월일은 필수입니다.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return "생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)";
    if (!photo) return "사진 업로드 후 크롭을 완료해주세요.";
    return null;
  }

  async function save(): Promise<boolean> {
    if (saving) return false;

    const v = validate();
    if (v) {
      setError(v);
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      if (form.mode === "create") {
        await createMember({
          name: form.name.trim(),
          phone: form.phone.trim(),
          birthDate: form.birthDateYmd.trim(),
          photoUrl: form.photoUrl.trim(),
        });

        // 사용하지 않은 임시 이미지 삭제
        const finalUrl = form.photoUrl;
        const toDelete = tempUploadedUrls.filter((u) => u !== finalUrl);
        if (toDelete.length) {
          await Promise.all(toDelete.map((u) => deleteBlob(u)));
        }

        setTempUploadedUrls([]);
        setOriginalPhotoUrl(null);
        setForm((p) => ({ ...p, open: false }));
        return true;
      }

      if (!form.memberId) {
        setError("memberId_missing");
        return false;
      }

      await updateMember(form.memberId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        birthDate: form.birthDateYmd.trim(),
        photoUrl: form.photoUrl.trim(),
      });

      // 원본 사진이 변경되었으면 삭제
      if (originalPhotoUrl && originalPhotoUrl !== form.photoUrl) {
        await deleteBlob(originalPhotoUrl);
      }

      // 사용하지 않은 임시 이미지 삭제
      const finalUrl = form.photoUrl;
      const toDelete = tempUploadedUrls.filter((u) => u !== finalUrl);
      if (toDelete.length) {
        await Promise.all(toDelete.map((u) => deleteBlob(u)));
      }

      setTempUploadedUrls([]);
      setOriginalPhotoUrl(null);
      setForm((p) => ({ ...p, open: false }));
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(form.mode === "create" ? "멤버 추가 실패" : "멤버 수정 실패");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    saving,
    error,
    openCreate,
    openEdit,
    close,
    updateForm,
    addTempUrl,
    save,
  };
}
