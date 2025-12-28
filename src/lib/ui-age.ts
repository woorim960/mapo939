export function koreanAgeFromBirthDate(birthDateIso: string) {
  const birth = new Date(birthDateIso);

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + 9 * 60 * 60_000);

  return kst.getFullYear() - birth.getFullYear() + 1;
}
