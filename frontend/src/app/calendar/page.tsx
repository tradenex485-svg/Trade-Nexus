'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { monthlySchedulesApi } from '@/lib/api';

interface MonthlySchedule {
  id: number;
  dated: string;
  week_day: string;
  lookup_id: number | null;
  trade_date: string | null;
  bid_week_day: number | null;
  holiday_name: string | null;
  bidweek_prices_published: number | null;
  bidweek_deals_submitted: number | null;
  nymex_futures_contract_expiration: number | null;
}

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  schedule?: MonthlySchedule;
}

const LOOKUP_TYPES = {
  1: { label: 'Trading Day', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  2: { label: 'Holiday', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
  3: { label: 'Weekend', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
  4: { label: 'Bid Week Day 1', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  5: { label: 'Bid Week Day 2', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  6: { label: 'Bid Week Day 3', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  7: { label: 'Bid Week Day 4', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  8: { label: 'Price Publication', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  9: { label: 'Deal Submission', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
  10: { label: 'NYMEX Expiration', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<MonthlySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [currentDate]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Get all schedules (the API returns { success: true, data: [], count: 0 })
      const response = await monthlySchedulesApi.getCalendar();

      // Extract the data array from the response
      const data = response?.data || [];

      // Filter for current month
      const monthSchedules = data.filter((s: MonthlySchedule) => {
        const scheduleDate = new Date(s.dated);
        return scheduleDate.getFullYear() === year && scheduleDate.getMonth() + 1 === month;
      });

      setSchedules(monthSchedules);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      setSchedules([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (): DayInfo[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysFromPrevMonth = firstDay.getDay();
    const daysInCurrentMonth = lastDay.getDate();

    const days: DayInfo[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      const schedule = schedules.find(s => s.dated === dateStr);
      days.push({ date, isCurrentMonth: true, schedule });
    }

    // Next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getLookupType = (schedule?: MonthlySchedule) => {
    if (!schedule) return null;

    // Priority order for overlapping special days
    if (schedule.nymex_futures_contract_expiration) return 10;
    if (schedule.bidweek_deals_submitted) return 9;
    if (schedule.bidweek_prices_published) return 8;
    if (schedule.bid_week_day && schedule.bid_week_day >= 4 && schedule.bid_week_day <= 7) {
      return schedule.bid_week_day;
    }
    if (schedule.holiday_name) return 2;
    if (schedule.lookup_id) return schedule.lookup_id;

    return 1; // Default trading day
  };

  const handleDayClick = (dayInfo: DayInfo) => {
    if (dayInfo.isCurrentMonth) {
      setSelectedDay(dayInfo);
      setShowDetailModal(true);
    }
  };

  const days = getDaysInMonth();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Trading Calendar</h1>
            <p className="text-sm md:text-base text-slate-400">View trading days, holidays, and key market events</p>
          </div>

          <Card className="cyber-border border-purple-500/30">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-xl md:text-2xl">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </CardTitle>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    <CalendarIcon className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Today</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Legend */}
              <div className="mb-6 p-4 glass border border-white/10 rounded-lg">
                <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Object.entries(LOOKUP_TYPES).map(([id, type]) => (
                    <div key={id} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border ${type.color}`} />
                      <span className="text-xs text-gray-300">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs sm:text-sm font-semibold text-gray-400 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {loading ? (
                  Array.from({ length: 42 }).map((_, i) => (
                    <div key={i} className="aspect-square glass border border-white/10 rounded-lg animate-pulse" />
                  ))
                ) : (
                  days.map((dayInfo, index) => {
                    const lookupType = getLookupType(dayInfo.schedule);
                    const typeConfig = lookupType ? LOOKUP_TYPES[lookupType as keyof typeof LOOKUP_TYPES] : null;

                    return (
                      <div
                        key={index}
                        onClick={() => handleDayClick(dayInfo)}
                        className={`aspect-square glass border rounded-lg p-1 sm:p-2 transition-all ${
                          dayInfo.isCurrentMonth
                            ? `cursor-pointer hover:scale-105 ${typeConfig
                              ? `${typeConfig.color} border`
                              : 'border-white/10 hover:border-white/30'}`
                            : 'border-white/5 opacity-40 cursor-default'
                        } ${
                          isToday(dayInfo.date) ? 'ring-1 sm:ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <div className="flex flex-col h-full">
                          <div className={`text-xs sm:text-sm font-medium ${
                            dayInfo.isCurrentMonth ? 'text-white' : 'text-gray-600'
                          }`}>
                            {dayInfo.date.getDate()}
                          </div>

                          {dayInfo.schedule && dayInfo.isCurrentMonth && (
                            <div className="mt-auto hidden sm:block">
                              {dayInfo.schedule.holiday_name && (
                                <div className="text-[10px] text-red-400 truncate" title={dayInfo.schedule.holiday_name}>
                                  {dayInfo.schedule.holiday_name}
                                </div>
                              )}
                              {dayInfo.schedule.nymex_futures_contract_expiration === 1 && (
                                <div className="text-[10px] text-blue-400">NYMEX</div>
                              )}
                              {dayInfo.schedule.bid_week_day && dayInfo.schedule.bid_week_day >= 4 && (
                                <div className="text-[10px] text-yellow-400">Bid D{dayInfo.schedule.bid_week_day - 3}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="cyber-border border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 md:space-y-3">
                {schedules
                  .filter(s => {
                    const scheduleDate = new Date(s.dated);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return scheduleDate >= today &&
                           (s.holiday_name || s.nymex_futures_contract_expiration || s.bid_week_day);
                  })
                  .sort((a, b) => new Date(a.dated).getTime() - new Date(b.dated).getTime())
                  .slice(0, 5)
                  .map((schedule) => {
                    const date = new Date(schedule.dated);
                    const lookupType = getLookupType(schedule);
                    const typeConfig = lookupType ? LOOKUP_TYPES[lookupType as keyof typeof LOOKUP_TYPES] : null;

                    return (
                      <div
                        key={schedule.id}
                        className={`p-3 md:p-4 rounded-lg border ${typeConfig?.color || 'border-white/10 bg-white/5'}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="font-medium text-white text-sm md:text-base">
                              {date.toLocaleDateString('default', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400">
                              {schedule.holiday_name && `Holiday: ${schedule.holiday_name}`}
                              {schedule.nymex_futures_contract_expiration && 'NYMEX Futures Contract Expiration'}
                              {schedule.bid_week_day && schedule.bid_week_day >= 4 && `Bid Week Day ${schedule.bid_week_day - 3}`}
                            </div>
                          </div>
                          {typeConfig && (
                            <div className="text-xs font-medium px-2 py-1 rounded bg-white/10 w-fit">
                              {typeConfig.label}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {schedules.filter(s => {
                  const scheduleDate = new Date(s.dated);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return scheduleDate >= today &&
                         (s.holiday_name || s.nymex_futures_contract_expiration || s.bid_week_day);
                }).length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    No upcoming events
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day Detail Modal */}
        {showDetailModal && selectedDay && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <div
              className="bg-slate-900 border border-purple-500/30 rounded-lg max-w-md w-full p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedDay.date.toLocaleDateString('default', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                  {isToday(selectedDay.date) && (
                    <span className="text-xs text-blue-400 font-medium">Today</span>
                  )}
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Day Type Badge */}
              {(() => {
                const lookupType = getLookupType(selectedDay.schedule);
                const typeConfig = lookupType ? LOOKUP_TYPES[lookupType as keyof typeof LOOKUP_TYPES] : null;
                return typeConfig ? (
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border ${typeConfig.color}`}>
                    <span className="text-sm font-medium">{typeConfig.label}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-500/20 bg-gray-500/10 text-gray-400">
                    <span className="text-sm font-medium">No Schedule Data</span>
                  </div>
                );
              })()}

              {/* Details */}
              <div className="space-y-3">
                {selectedDay.schedule ? (
                  <>
                    {/* Holiday Information */}
                    {selectedDay.schedule.holiday_name && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="text-xs text-gray-400 mb-1">Holiday</div>
                        <div className="text-sm text-white font-medium">{selectedDay.schedule.holiday_name}</div>
                      </div>
                    )}

                    {/* NYMEX Expiration */}
                    {selectedDay.schedule.nymex_futures_contract_expiration === 1 && (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="text-xs text-gray-400 mb-1">Special Event</div>
                        <div className="text-sm text-white font-medium">NYMEX Futures Contract Expiration</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Typically the third business day before the end of the month for the near-month contract
                        </div>
                      </div>
                    )}

                    {/* Bid Week Information */}
                    {selectedDay.schedule.bid_week_day && selectedDay.schedule.bid_week_day >= 4 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="text-xs text-gray-400 mb-1">Bid Week</div>
                        <div className="text-sm text-white font-medium">
                          Bid Week Day {selectedDay.schedule.bid_week_day - 3}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Part of the monthly bidding period for natural gas pricing
                        </div>
                      </div>
                    )}

                    {/* Bidweek Prices Published */}
                    {selectedDay.schedule.bidweek_prices_published === 1 && (
                      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="text-xs text-gray-400 mb-1">Price Publication</div>
                        <div className="text-sm text-white font-medium">Bidweek Prices Published</div>
                      </div>
                    )}

                    {/* Bidweek Deals Submitted */}
                    {selectedDay.schedule.bidweek_deals_submitted === 1 && (
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div className="text-xs text-gray-400 mb-1">Deal Submission</div>
                        <div className="text-sm text-white font-medium">Bidweek Deals Submitted</div>
                      </div>
                    )}

                    {/* Trading Day Status */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-xs text-gray-400 mb-1">Trading Status</div>
                      <div className="text-sm text-white">
                        {selectedDay.schedule.lookup_id === 1 ? (
                          <span className="text-green-400">Trading Day</span>
                        ) : selectedDay.schedule.lookup_id === 2 ? (
                          <span className="text-red-400">Market Holiday</span>
                        ) : selectedDay.schedule.lookup_id === 3 ? (
                          <span className="text-gray-400">Weekend</span>
                        ) : (
                          <span className="text-gray-400">Unknown Status</span>
                        )}
                      </div>
                    </div>

                    {/* Show message if it's a regular day with no special events */}
                    {!selectedDay.schedule.holiday_name &&
                     selectedDay.schedule.nymex_futures_contract_expiration !== 1 &&
                     !selectedDay.schedule.bid_week_day &&
                     selectedDay.schedule.bidweek_prices_published !== 1 &&
                     selectedDay.schedule.bidweek_deals_submitted !== 1 &&
                     selectedDay.schedule.lookup_id === 1 && (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        Regular trading day - no special events
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No schedule information available for this date
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <Button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full"
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
