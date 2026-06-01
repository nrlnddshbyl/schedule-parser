export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { schedule } = req.body;

        if (!schedule) {
            return res.status(400).json({ error: 'Schedule data required' });
        }

        const ics = generateICS(schedule);

        res.setHeader('Content-Type', 'text/calendar;charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="schedule.ics"');
        res.status(200).send(ics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate calendar' });
    }
}

function generateICS(schedule) {
    const now = new Date();
    const timestamp = formatDateTime(now);

    let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Schedule Parser//Schedule Parser//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Work Schedule
X-WR-TIMEZONE:America/New_York
X-WR-CALDESC:Your work schedule
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:20231105T020000
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20230312T020000
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
END:VTIMEZONE
`;

    let eventId = 0;

    schedule.forEach(day => {
        const dateObj = parseScheduleDate(day.date);

        day.shifts.forEach(shift => {
            if (shift.name === 'Off') {
                const dateStr = dateObj.toISOString().split('T')[0].replace(/-/g, '');
                ics += `BEGIN:VEVENT
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${addDays(dateObj, 1).toISOString().split('T')[0].replace(/-/g, '')}
DTSTAMP:${timestamp}
UID:off-${dateStr}-${eventId}@schedule-parser
CREATED:${timestamp}
DESCRIPTION:Day off
LAST-MODIFIED:${timestamp}
SUMMARY:Off
TRANSP:TRANSPARENT
END:VEVENT
`;
            } else {
                const [startTime, endTime] = shift.time.split(' - ');
                const startDT = parseTime(dateObj, startTime);
                const endDT = parseTime(dateObj, endTime);

                const startStr = formatDateTime(startDT);
                const endStr = formatDateTime(endDT);

                ics += `BEGIN:VEVENT
DTSTART;TZID=America/New_York:${startStr}
DTEND;TZID=America/New_York:${endStr}
DTSTAMP:${timestamp}
UID:shift-${dateObj.toISOString().split('T')[0]}-${eventId}@schedule-parser
CREATED:${timestamp}
DESCRIPTION:${shift.name}
LAST-MODIFIED:${timestamp}
LOCATION:Work
SUMMARY:${shift.name}
TRANSP:OPAQUE
END:VEVENT
`;
            }
            eventId++;
        });
    });

    ics += `END:VCALENDAR`;

    return ics;
}

function parseScheduleDate(dateStr) {
    const date = new Date(dateStr);
    return date;
}

function parseTime(dateObj, timeStr) {
    const [time, period] = timeStr.trim().split(/\s+/);
    const [hours, minutes] = time.split(':').map(Number);

    let hour = hours;
    if (period.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
    }

    const result = new Date(dateObj);
    result.setHours(hour, minutes, 0, 0);
    return result;
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}