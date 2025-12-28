import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Inline helper functions to avoid cyclic dependencies with src/lib/kst-attendance
function getKstYmdKey(date = new Date()) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().split("T")[0];
}

function kstYmdToUtcDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function pointsFor(status: "PRESENT" | "LATE" | "ABSENT") {
  if (status === "PRESENT") return 1000;
  if (status === "LATE") return 500;
  return 0;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

type SeedMember = {
  name: string;
  phone: string;
  birthYmd: string; // YYYY-MM-DD
  photoUrl: string;
};

const members: SeedMember[] = [
  // 학생 제공: 20세 미만 (UI에서 20세 이상이면 청년회)
  { name: "김하늘", phone: "010-2345-6789", birthYmd: "2008-03-14", photoUrl: "https://picsum.photos/seed/m1/400/400" },
  { name: "이서준", phone: "010-3456-7890", birthYmd: "2007-11-02", photoUrl: "https://picsum.photos/seed/m2/400/400" },
  { name: "박지안", phone: "010-4567-8901", birthYmd: "2009-06-20", photoUrl: "https://picsum.photos/seed/m3/400/400" },
  { name: "최민준", phone: "010-5678-9012", birthYmd: "2006-09-08", photoUrl: "https://picsum.photos/seed/m4/400/400" },

  // 청년회: 20세 이상
  { name: "정유진", phone: "010-6789-0123", birthYmd: "2003-01-22", photoUrl: "https://picsum.photos/seed/m5/400/400" },
  { name: "한도윤", phone: "010-7890-1234", birthYmd: "2002-05-17", photoUrl: "https://picsum.photos/seed/m6/400/400" },
  { name: "신지우", phone: "010-8901-2345", birthYmd: "2000-12-05", photoUrl: "https://picsum.photos/seed/m7/400/400" },
  { name: "윤서연", phone: "010-9012-3456", birthYmd: "1999-08-30", photoUrl: "https://picsum.photos/seed/m8/400/400" },
  { name: "오태훈", phone: "010-1122-3344", birthYmd: "1998-04-11", photoUrl: "https://picsum.photos/seed/m9/400/400" },
  { name: "장수민", phone: "010-2233-4455", birthYmd: "2001-10-09", photoUrl: "https://picsum.photos/seed/m10/400/400" },
  { name: "문예은", phone: "010-3344-5566", birthYmd: "2004-07-27", photoUrl: "https://picsum.photos/seed/m11/400/400" },
  { name: "임지훈", phone: "010-4455-6677", birthYmd: "2005-02-03", photoUrl: "https://picsum.photos/seed/m12/400/400" },
];

function ymdToDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

async function main() {
  // 1) 멤버 upsert (phone을 unique로 쓸 수도 있지만, 지금 스키마가 phone unique인지 모르니 name+phone 조합으로 먼저 find)
  const createdMemberIds: string[] = [];

  for (const m of members) {
    // 같은 name+phone이 있으면 업데이트, 없으면 생성
    const existing = await prisma.member.findFirst({
      where: { name: m.name, phone: m.phone },
      select: { id: true },
    });

    const member = existing
      ? await prisma.member.update({
          where: { id: existing.id },
          data: {
            birthDate: ymdToDate(m.birthYmd),
            photoUrl: m.photoUrl,
            isActive: true,
          },
          select: { id: true },
        })
      : await prisma.member.create({
          data: {
            name: m.name,
            phone: m.phone,
            birthDate: ymdToDate(m.birthYmd),
            photoUrl: m.photoUrl,
            isActive: true,
          },
          select: { id: true },
        });

    createdMemberIds.push(member.id);
  }

  // 2) 오늘 출석/지각 몇 명 찍어두기
  const todayYmd = getKstYmdKey();
  const todayDate = kstYmdToUtcDate(todayYmd);

  // 앞 6명: 출석, 다음 2명: 지각 (예시)
  const presentIds = createdMemberIds.slice(0, 6);
  const lateIds = createdMemberIds.slice(6, 8);

  for (const id of presentIds) {
    await prisma.attendance.upsert({
      where: { memberId_date: { memberId: id, date: todayDate } },
      update: { status: "PRESENT", points: pointsFor("PRESENT") },
      create: { memberId: id, date: todayDate, status: "PRESENT", points: pointsFor("PRESENT") },
    });
  }

  for (const id of lateIds) {
    await prisma.attendance.upsert({
      where: { memberId_date: { memberId: id, date: todayDate } },
      update: { status: "LATE", points: pointsFor("LATE") },
      create: { memberId: id, date: todayDate, status: "LATE", points: pointsFor("LATE") },
    });
  }

  console.log(`✅ Seeded ${createdMemberIds.length} members`);
  console.log(`✅ Seeded attendance for today (${todayYmd}): PRESENT=${presentIds.length}, LATE=${lateIds.length}`);
}

main()
  .catch((e) => {
    console.error("SEED_MEMBERS_ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
