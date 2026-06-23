import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, ENDPOINTS } from '../backendConnection';
import Top from '../MainPage/components/top';
import './CalendarPage.css';

interface CalendarTask {
    id: number;
    nazwa: string;
    deadline: string | null;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

interface CalendarProject {
    id: number;
    nazwa: string;
    dataOddania: string;
    tasks: CalendarTask[];
}

interface CalendarItem {
    type: 'project' | 'task';
    id: number;
    nazwa: string;
    projectName: string;
    projectId: number;
    date: string;
    status?: string;
}

function CalendarPage() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [calendarData, setCalendarData] = useState<CalendarProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCalendarData = async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth(ENDPOINTS.projects.getCalendar());
                if (!res.ok) throw new Error("Nie udało się pobrać terminów kalendarza.");
                const data = await res.json();
                setCalendarData(data);
            } catch (err: any) {
                setError(err.message || "Wystąpił błąd.");
            } finally {
                setLoading(false);
            }
        };

        loadCalendarData();
    }, []);

    // Helper: list all tasks and projects as flat list of events
    const getEvents = (): CalendarItem[] => {
        const events: CalendarItem[] = [];
        calendarData.forEach(proj => {
            if (proj.dataOddania) {
                events.push({
                    type: 'project',
                    id: proj.id,
                    nazwa: proj.nazwa,
                    projectName: proj.nazwa,
                    projectId: proj.id,
                    date: proj.dataOddania
                });
            }
            proj.tasks.forEach(task => {
                if (task.deadline) {
                    events.push({
                        type: 'task',
                        id: task.id,
                        nazwa: task.nazwa,
                        projectName: proj.nazwa,
                        projectId: proj.id,
                        date: task.deadline,
                        status: task.status
                    });
                }
            });
        });
        return events;
    };

    const events = getEvents();

    // Calendar generation helpers
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => {
        const d = new Date(y, m, 1).getDay();
        return d === 0 ? 6 : d - 1; // convert to Mon-Sun: 0=Mon, 6=Sun
    };

    const totalDays = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);

    const prevMonthDays = getDaysInMonth(year, month - 1);

    const monthNames = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
    ];

    const days = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const d = prevMonthDays - i;
        days.push({ day: d, isCurrentMonth: false, date: new Date(year, month - 1, d) });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
        days.push({ day: d, isCurrentMonth: true, date: new Date(year, month, d) });
    }

    // Next month filler days
    const totalSlots = 42; // 6 rows of 7 days
    const nextDaysCount = totalSlots - days.length;
    for (let d = 1; d <= nextDaysCount; d++) {
        days.push({ day: d, isCurrentMonth: false, date: new Date(year, month + 1, d) });
    }

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return date.getDate() === selectedDate.getDate() &&
               date.getMonth() === selectedDate.getMonth() &&
               date.getFullYear() === selectedDate.getFullYear();
    };

    const getFormattedDateString = (date: Date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    const getEventsForDate = (date: Date) => {
        const dateStr = getFormattedDateString(date);
        return events.filter(e => e.date === dateStr);
    };

    const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    return (
        <div className="cal-page-wrapper">
            <Top />
            
            <div className="cal-container">
                <div className="cal-main-layout">
                    {/* Kalendarz */}
                    <div className="cal-card cal-calendar-box">
                        <div className="cal-header">
                            <h2>{monthNames[month]} {year}</h2>
                            <div className="cal-nav-buttons">
                                <button className="cal-nav-btn" onClick={prevMonth}>←</button>
                                <button className="cal-nav-btn" style={{ fontSize: '12px' }} onClick={() => setCurrentDate(new Date())}>Dzisiaj</button>
                                <button className="cal-nav-btn" onClick={nextMonth}>→</button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="cal-spinner-wrapper">
                                <span className="cal-spinner"></span>
                                <span>Wczytywanie kalendarza...</span>
                            </div>
                        ) : error ? (
                            <div className="cal-error">{error}</div>
                        ) : (
                            <>
                                <div className="cal-weekdays">
                                    <span>Pon</span>
                                    <span>Wt</span>
                                    <span>Śr</span>
                                    <span>Czw</span>
                                    <span>Pt</span>
                                    <span>Sob</span>
                                    <span>Nied</span>
                                </div>
                                <div className="cal-days-grid">
                                    {days.map((slot, index) => {
                                        const slotEvents = getEventsForDate(slot.date);
                                        const hasProjects = slotEvents.some(e => e.type === 'project');
                                        const hasTasks = slotEvents.some(e => e.type === 'task');

                                        return (
                                            <div 
                                                key={index} 
                                                className={`cal-day-slot ${!slot.isCurrentMonth ? 'cal-day-off' : ''} ${isToday(slot.date) ? 'cal-day-today' : ''} ${isSelected(slot.date) ? 'cal-day-selected' : ''}`}
                                                onClick={() => setSelectedDate(slot.date)}
                                            >
                                                <span className="cal-day-num">{slot.day}</span>
                                                <div className="cal-day-bullets">
                                                    {hasProjects && <span className="cal-bullet cal-bullet-proj" title="Termin oddania projektu" />}
                                                    {hasTasks && <span className="cal-bullet cal-bullet-task" title="Deadline zadania" />}
                                                </div>
                                                {slotEvents.length > 0 && (
                                                    <span className="cal-day-badge">{slotEvents.length}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Szczegóły wybranego dnia */}
                    <div className="cal-card cal-details-box">
                        <h3 className="cal-details-title">
                            Terminy: {selectedDate ? selectedDate.toLocaleDateString("pl-PL") : "Wybierz dzień"}
                        </h3>
                        
                        <div className="cal-events-list">
                            {selectedDayEvents.length === 0 ? (
                                <div className="cal-empty-state">
                                    <span>📅</span>
                                    <p>Brak zaplanowanych terminów na ten dzień.</p>
                                </div>
                            ) : (
                                selectedDayEvents.map((evt, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`cal-event-item ${evt.type === 'project' ? 'cal-event-project' : 'cal-event-task'}`}
                                        onClick={() => navigate(`/project/${evt.projectId}/tasks`)}
                                    >
                                        <div className="cal-event-tag">
                                            {evt.type === 'project' ? 'Projekt' : 'Zadanie'}
                                        </div>
                                        <h4 className="cal-event-name">{evt.nazwa}</h4>
                                        <p className="cal-event-project-info">
                                            Projekt: <strong>{evt.projectName}</strong>
                                        </p>
                                        {evt.status && (
                                            <div className="cal-event-status-row">
                                                <span>Status:</span>
                                                <span className={`cal-task-status cal-status-${evt.status.toLowerCase()}`}>
                                                    {evt.status === 'TODO' ? 'Do zrobienia' : 
                                                     evt.status === 'IN_PROGRESS' ? 'W realizacji' : 'Zakończone'}
                                                </span>
                                            </div>
                                        )}
                                        <span className="cal-go-link">Przejdź do projektu →</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CalendarPage;
