import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Award, 
  Calendar, 
  Clock, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  History,
  AlertCircle
} from "lucide-react";
import { Attendance, Holiday, DaySetting } from "../types";

interface SiswaBadgesPanelProps {
  session: { uid: string; name: string; kelas: string } | null;
  attendance: Attendance[];
  holidays: Holiday[];
  settings: DaySetting[];
}

export const SiswaBadgesPanel: React.FC<SiswaBadgesPanelProps> = ({
  session,
  attendance,
  holidays,
  settings,
}) => {
  const indonesianMonths = useMemo(() => [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ], []);

  // Filter attendance to ONLY this student
  const studentAttendance = useMemo(() => {
    if (!session?.uid) return [];
    return attendance.filter((a) => a.nisn === session.uid);
  }, [attendance, session]);

  // Main badge/streak calculator function
  const calculateMonthStats = (year: number, month0Indexed: number) => {
    const totalDays = new Date(year, month0Indexed + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month0Indexed;
    const maxDayToCheck = isCurrentMonth ? today.getDate() : totalDays;

    const dayMapLong = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    let requiredSchoolDays = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let totalOnTime = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalSickOrPermission = 0;

    for (let d = 1; d <= maxDayToCheck; d++) {
      const curDate = new Date(year, month0Indexed, d);
      const dayOfWeek = curDate.getDay();
      const dateStr = `${year}-${String(month0Indexed + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      // Sunday is always a holiday in Indonesia school calendar
      if (dayOfWeek === 0) continue;

      // Check if official academic holiday
      const isHoliday = holidays.some((h) => h.tanggal === dateStr);
      if (isHoliday) continue;

      // Check settings to see if the day is configured as inactive
      const dayNameLong = dayMapLong[dayOfWeek];
      const daySetting = settings.find((s) => s.hari === dayNameLong);
      const isDayInactive = !!(daySetting?.reasonInactive);
      if (isDayInactive) continue;

      requiredSchoolDays++;

      const att = studentAttendance.find((a) => a.tanggal === dateStr);

      if (att) {
        if (att.status === "Hadir") {
          const isLate = att.terlambat !== undefined && att.terlambat > 0;
          if (isLate) {
            totalLate++;
            currentStreak = 0; // Late breaks the on-time streak
          } else {
            totalOnTime++;
            currentStreak++;
            if (currentStreak > maxStreak) {
              maxStreak = currentStreak;
            }
          }
        } else if (att.status === "Izin" || att.status === "Sakit") {
          totalSickOrPermission++;
          // Sick/Permission breaks on-time streak
          currentStreak = 0;
        } else if (att.status === "Alfa") {
          totalAbsent++;
          currentStreak = 0;
        }
      } else {
        // If there's no attendance record yet. 
        // For current day: if they haven't scanned yet and today is still active, we don't break the streak immediately
        const isToday = isCurrentMonth && d === today.getDate();
        if (!isToday) {
          totalAbsent++;
          currentStreak = 0;
        }
      }
    }

    // Badge classification based on the max streak in that month:
    // 1. Gold: Perfect Month-long / At least 20 consecutive days
    // 2. Silver: At least 15 consecutive days
    // 3. Bronze: At least 7 consecutive days
    let badge: "Emas" | "Perak" | "Perunggu" | "None" = "None";
    const targetForGold = Math.min(20, requiredSchoolDays);

    if (maxStreak >= targetForGold && targetForGold > 0) {
      badge = "Emas";
    } else if (maxStreak >= 15) {
      badge = "Perak";
    } else if (maxStreak >= 7) {
      badge = "Perunggu";
    }

    return {
      requiredSchoolDays,
      totalOnTime,
      totalLate,
      totalAbsent,
      totalSickOrPermission,
      maxStreak,
      currentStreak,
      badge,
    };
  };

  const today = new Date();
  const activeYear = today.getFullYear();
  const activeMonthIdx = today.getMonth();

  // Active Month Calculations
  const currentMonthStats = useMemo(() => {
    return calculateMonthStats(activeYear, activeMonthIdx);
  }, [activeYear, activeMonthIdx, studentAttendance, holidays, settings]);

  // Compute history of completed months in the current academic year (2026/activeYear)
  const historyStats = useMemo(() => {
    const list = [];
    // Calculate stats for each month from January (index 0) up to the month before current month
    for (let m = 0; m < activeMonthIdx; m++) {
      const stats = calculateMonthStats(activeYear, m);
      list.push({
        monthIndex: m,
        monthName: indonesianMonths[m],
        year: activeYear,
        ...stats,
      });
    }
    // Sort descending (latest month first)
    return list.reverse();
  }, [activeYear, activeMonthIdx, studentAttendance, holidays, settings, indonesianMonths]);

  // Get next badge target progress
  const nextTarget = useMemo(() => {
    const streak = currentMonthStats.currentStreak;
    if (streak < 7) {
      return { label: "Rajin Perunggu", target: 7, current: streak, color: "from-amber-600 to-amber-700" };
    } else if (streak < 15) {
      return { label: "Disiplin Perak", target: 15, current: streak, color: "from-slate-400 to-slate-500" };
    } else {
      const totalSchoolDays = Math.min(20, currentMonthStats.requiredSchoolDays);
      return { label: "Teladan Emas", target: totalSchoolDays, current: streak, color: "from-yellow-500 to-amber-500" };
    }
  }, [currentMonthStats]);

  const progressPercentage = Math.min(100, Math.round((nextTarget.current / nextTarget.target) * 100));

  return (
    <motion.div
      key="siswa-badges"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-32"
    >
      {/* HEADER SECTION */}
      <div
        className="flex flex-wrap gap-4 items-center justify-between p-6 rounded-3xl border"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.5)",
          backdropFilter: "blur(4px)",
          borderColor: "rgba(255, 255, 255, 0.2)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-3 rounded-2xl text-amber-700 animate-bounce">
            <Award size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-amber-950 uppercase tracking-tighter">
              Lencana Presensi Siswa
            </h2>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-none mt-1">
              Rapor Kedisiplinan & Lencana Prestasi
            </p>
          </div>
        </div>
        <div className="bg-amber-50/70 border border-amber-200/50 px-4 py-2 rounded-2xl text-amber-900 flex items-center gap-2">
          <Sparkles className="text-amber-600 shrink-0" size={16} />
          <span className="text-[11px] font-black uppercase text-amber-950">
            {indonesianMonths[activeMonthIdx]} {activeYear}
          </span>
        </div>
      </div>

      {/* THREE MAIN BADGES VISUALIZATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BRONZE */}
        <div className={`bg-white rounded-[2rem] p-6 border transition-all relative overflow-hidden ${currentMonthStats.maxStreak >= 7 ? "border-amber-200 shadow-md ring-2 ring-amber-100/30" : "border-gray-200 opacity-60"}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-bl-[3rem] -z-10" />
          <div className="flex justify-between items-start">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentMonthStats.maxStreak >= 7 ? "bg-amber-100 text-amber-700 shadow" : "bg-zinc-100 text-zinc-400"}`}>
              <Award size={24} className={currentMonthStats.maxStreak >= 7 ? "animate-pulse" : ""} />
            </div>
            {currentMonthStats.maxStreak >= 7 ? (
              <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-200">
                Diraih
              </span>
            ) : (
              <span className="bg-zinc-100 text-zinc-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                Terkunci
              </span>
            )}
          </div>
          <div className="mt-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-950">Rajin Perunggu</h4>
            <p className="text-[10px] text-zinc-500 font-bold mt-1 line-clamp-2">
              Hadir tepat waktu 7 hari berturut-turut dalam bulan berjalan.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-[10px] font-black uppercase">
            <span className="text-zinc-400">Ketentuan:</span>
            <span className={currentMonthStats.maxStreak >= 7 ? "text-amber-700" : "text-zinc-500"}>
              Streak 7 Hari
            </span>
          </div>
        </div>

        {/* SILVER */}
        <div className={`bg-white rounded-[2rem] p-6 border transition-all relative overflow-hidden ${currentMonthStats.maxStreak >= 15 ? "border-slate-300 shadow-md ring-2 ring-slate-100" : "border-gray-200 opacity-60"}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[3rem] -z-10" />
          <div className="flex justify-between items-start">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentMonthStats.maxStreak >= 15 ? "bg-slate-100 text-slate-600 shadow" : "bg-zinc-100 text-zinc-400"}`}>
              <Award size={24} className={currentMonthStats.maxStreak >= 15 ? "animate-pulse" : ""} />
            </div>
            {currentMonthStats.maxStreak >= 15 ? (
              <span className="bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200">
                Diraih
              </span>
            ) : (
              <span className="bg-zinc-100 text-zinc-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                Terkunci
              </span>
            )}
          </div>
          <div className="mt-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-950">Disiplin Perak</h4>
            <p className="text-[10px] text-zinc-500 font-bold mt-1 line-clamp-2">
              Hadir tepat waktu 15 hari berturut-turut dalam bulan berjalan.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-[10px] font-black uppercase">
            <span className="text-zinc-400">Ketentuan:</span>
            <span className={currentMonthStats.maxStreak >= 15 ? "text-slate-600" : "text-zinc-500"}>
              Streak 15 Hari
            </span>
          </div>
        </div>

        {/* GOLD */}
        <div className={`bg-white rounded-[2rem] p-6 border transition-all relative overflow-hidden ${currentMonthStats.badge === "Emas" ? "border-yellow-250 shadow-md ring-2 ring-yellow-100" : "border-gray-200 opacity-60"}`}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-bl-[3rem] -z-10" />
          <div className="flex justify-between items-start">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentMonthStats.badge === "Emas" ? "bg-yellow-100 text-yellow-600 shadow" : "bg-zinc-100 text-zinc-400"}`}>
              <Award size={24} className={currentMonthStats.badge === "Emas" ? "animate-bounce" : ""} />
            </div>
            {currentMonthStats.badge === "Emas" ? (
              <span className="bg-yellow-105 text-yellow-850 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-yellow-200">
                Diraih
              </span>
            ) : (
              <span className="bg-zinc-100 text-zinc-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                Terkunci
              </span>
            )}
          </div>
          <div className="mt-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-950">Teladan Emas</h4>
            <p className="text-[10px] text-zinc-500 font-bold mt-1 line-clamp-2">
              Hadir tepat waktu setiap hari sekolah berturut-turut dalam sebulan berjalan.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-[10px] font-black uppercase">
            <span className="text-zinc-400">Ketentuan:</span>
            <span className={currentMonthStats.badge === "Emas" ? "text-yellow-600" : "text-zinc-500"}>
              Satu Bulan Penuh
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ACTIVE MOUNT METRICS & PROGRESS BAR */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/20 rounded-bl-[4rem] -z-10 transition-transform group-hover:scale-110" />
            <h3 className="text-sm font-black text-amber-950 uppercase tracking-[0.2em] mb-6">
              Streak Aktif
            </h3>

            {/* STREAK ON FIRE */}
            <div className="flex flex-col items-center justify-center p-6 bg-amber-50/45 rounded-[2rem] border border-amber-100 border-dashed text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 animate-pulse">
                <Flame size={32} />
              </div>
              <div className="mt-4">
                <span className="text-4xl font-black text-amber-950 block">
                  {currentMonthStats.currentStreak}
                </span>
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                  Hari Beruntun Tepat Waktu
                </span>
              </div>
              <p className="text-[9px] font-bold text-zinc-400 mt-2 italic">
                {currentMonthStats.currentStreak > 0
                  ? "Hebat! Pertahankan konsistensi kehadiran Anda."
                  : "Mulai streak Anda hari ini dengan hadir tepat waktu!"}
              </p>
            </div>

            {/* UPCOMING PROGRESS */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="text-zinc-400">Target Selanjutnya:</span>
                <span className="text-amber-800">{nextTarget.label}</span>
              </div>
              <div className="w-full bg-zinc-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-zinc-200/50">
                <div 
                  className={`bg-gradient-to-r ${nextTarget.color} h-full rounded-full transition-all duration-1000 shadow-sm`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400">
                <span>Sekarang: {nextTarget.current} Hari</span>
                <span>Butuh: {nextTarget.target} Hari</span>
              </div>
            </div>

            {/* SMALL MONTH REKAP METRICS */}
            <div className="mt-8 pt-6 border-t border-zinc-100 space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Rekap Bulanan ({indonesianMonths[activeMonthIdx]})
              </p>
              
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3 bg-green-50/50 rounded-2xl border border-green-105">
                  <span className="text-[8px] font-black text-green-700 uppercase tracking-widest block leading-tight">
                    Tepat Waktu
                  </span>
                  <span className="text-base font-black text-green-950 block mt-1">
                    {currentMonthStats.totalOnTime} Hari
                  </span>
                </div>
                
                <div className="p-3 bg-red-50/50 rounded-2xl border border-red-105">
                  <span className="text-[8px] font-black text-red-700 uppercase tracking-widest block leading-tight">
                    Terlambat
                  </span>
                  <span className="text-base font-black text-red-950 block mt-1">
                    {currentMonthStats.totalLate} Hari
                  </span>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-105">
                  <span className="text-[8px] font-black text-blue-700 uppercase tracking-widest block leading-tight">
                    Izin / Sakit
                  </span>
                  <span className="text-base font-black text-blue-950 block mt-1">
                    {currentMonthStats.totalSickOrPermission} Hari
                  </span>
                </div>

                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/60">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block leading-tight">
                    Alpha / Alasan
                  </span>
                  <span className="text-base font-black text-zinc-950 block mt-1">
                    {currentMonthStats.totalAbsent} Hari
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <p className="text-[9px] text-amber-900 leading-normal font-medium">
                  <strong>Penting:</strong> Kehadiran dihitung berdasarkan hari sekolah aktif (Minggu & Tanggal Libur Akademik ditiadakan).
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* BANNER INSTRUCTIONAL & MONTH-BY-MONTH HISTORY */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-zinc-100 shadow-xl overflow-hidden relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-zinc-150 p-2.5 rounded-xl text-zinc-600">
                <History size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest leading-none">
                  Riwayat Lencana Bulanan
                </h3>
                <p className="text-[9px] text-zinc-400 font-bold mt-1">
                  Arsip pencapaian bulan-bulan sebelumnya
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse font-sans">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 font-black text-[10px] uppercase tracking-widest">
                    <th className="py-4 px-3">Bulan</th>
                    <th className="py-4 px-3 text-center">Tepat Waktu</th>
                    <th className="py-4 px-3 text-center">Max Streak</th>
                    <th className="py-4 px-3 text-right">Lencana Penghargaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {historyStats.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs font-bold text-zinc-400">
                        Belum ada riwayat bulan sebelumnya dalam tahun ajaran berjalan.
                      </td>
                    </tr>
                  ) : (
                    historyStats.map((item) => (
                      <tr key={item.monthIndex} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-4 px-3">
                          <span className="font-black text-zinc-850 block">{item.monthName}</span>
                          <span className="text-[9px] font-bold text-zinc-450">{item.year}</span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="bg-green-50 text-green-700 text-[11px] font-black px-2.5 py-1 rounded-lg border border-green-105">
                            {item.totalOnTime} / {item.requiredSchoolDays} Hari
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Flame size={12} className="text-amber-500" />
                            <span className="text-zinc-800 font-black text-xs">
                              {item.maxStreak} Hari
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-right">
                          {item.badge === "None" ? (
                            <span className="text-zinc-400 font-black text-xs italic pr-4">-</span>
                          ) : (
                            <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-150 px-3 py-1 rounded-full text-zinc-900 shadow-sm select-none">
                              <Award 
                                size={14} 
                                className={
                                  item.badge === "Emas" 
                                    ? "text-yellow-500" 
                                    : item.badge === "Perak" 
                                      ? "text-slate-400" 
                                      : "text-amber-600"
                                } 
                              />
                              <span className="text-[10px] font-black uppercase text-zinc-800">
                                {item.badge === "Emas" 
                                  ? "Teladan Emas" 
                                  : item.badge === "Perak" 
                                    ? "Disiplin Perak" 
                                    : "Rajin Perunggu"
                                }
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
