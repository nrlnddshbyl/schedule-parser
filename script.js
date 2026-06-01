function parseSchedule() {
    const input = document.getElementById('scheduleInput').value;
    const errorDiv = document.getElementById('errorMessage');
    
    errorDiv.classList.remove('show');

    if (!input.trim()) {
        showError('Please paste your schedule text first.');
        return;
    }

    try {
        const schedule = extractSchedule(input);
        displaySchedule(schedule);
        document.getElementById('outputSection').style.display = 'block';
    } catch (error) {
        showError('Error parsing schedule: ' + error.message);
    }
}

function extractSchedule(text) {
    const schedule = [];
    
    // Split by day headers (date patterns)
    const dayPattern = /([A-Za-z]+day,\s+[A-Za-z]+\s+\d+,\s+\d{4})/g;
    const parts = text.split(dayPattern);
    
    // Process pairs of [date, content]
    for (let i = 1; i < parts.length; i += 2) {
        const date = parts[i];
        const content = parts[i + 1] || '';
        
        const dayData = {
            date: date.trim(),
            shifts: []
        };
        
        // Check if it's an "Off" day
        if (content.includes('Off') && !content.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/i)) {
            dayData.shifts = [{ name: 'Off', time: '' }];
        } else {
            // Extract shifts from the content
            const lines = content.split('\n').filter(line => line.trim());
            
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j].trim();
                
                // Look for time patterns (H:MM AM/PM - H:MM AM/PM)
                const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
                const timeMatch = line.match(timePattern);
                
                if (timeMatch) {
                    const startTime = timeMatch[1];
                    const endTime = timeMatch[2];
                    
                    // Look back for shift name
                    let shiftName = '';
                    for (let k = j - 1; k >= 0; k--) {
                        const prevLine = lines[k].trim();
                        if (prevLine && !prevLine.match(timePattern)) {
                            shiftName = prevLine;
                            break;
                        }
                    }
                    
                    if (shiftName) {
                        dayData.shifts.push({
                            name: shiftName,
                            time: `${startTime} - ${endTime}`
                        });
                    }
                }
            }
            
            // If no shifts found but content has data, it might be structured differently
            if (dayData.shifts.length === 0 && content.trim()) {
                const timeMatches = content.match(/([A-Za-z_]+)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))/gi);
                if (timeMatches) {
                    timeMatches.forEach(match => {
                        const [name, time] = match.split(/\s+(?=\d{1,2}:\d{2})/);
                        dayData.shifts.push({
                            name: name.trim(),
                            time: time.trim()
                        });
                    });
                }
            }
        }
        
        if (dayData.shifts.length > 0) {
            schedule.push(dayData);
        }
    }
    
    return schedule;
}

function displaySchedule(schedule) {
    const output = document.getElementById('output');
    output.innerHTML = '';
    
    schedule.forEach(day => {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        
        // Extract just the day name
        const dayMatch = day.date.match(/([A-Za-z]+day)/);
        const dayName = dayMatch ? dayMatch[1] : day.date;
        
        dayCard.innerHTML = `
            <div class="day-title">
                ${dayName}
                <span class="date">${day.date}</span>
            </div>
        `;
        
        const shiftsList = document.createElement('div');
        shiftsList.className = 'shifts-list';
        
        if (day.shifts.length === 1 && day.shifts[0].name === 'Off') {
            const offShift = document.createElement('div');
            offShift.className = 'shift off';
            offShift.innerHTML = '<div class="off-day">Off</div>';
            shiftsList.appendChild(offShift);
        } else {
            day.shifts.forEach(shift => {
                const shiftDiv = document.createElement('div');
                shiftDiv.className = 'shift';
                shiftDiv.innerHTML = `
                    <div class="shift-name">${shift.name}</div>
                    <div class="shift-time">${shift.time}</div>
                `;
                shiftsList.appendChild(shiftDiv);
            });
        }
        
        dayCard.appendChild(shiftsList);
        output.appendChild(dayCard);
    });
    
    // Store parsed data globally for export
    window.parsedSchedule = schedule;
}

function downloadJSON() {
    if (!window.parsedSchedule) return;
    
    const json = JSON.stringify(window.parsedSchedule, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadFile(blob, 'schedule.json');
}

function downloadCSV() {
    if (!window.parsedSchedule) return;
    
    let csv = 'Date,Shift Name,Start Time,End Time\n';
    
    window.parsedSchedule.forEach(day => {
        day.shifts.forEach(shift => {
            if (shift.name === 'Off') {
                csv += `"${day.date}","Off","",""\n`;
            } else {
                const [start, end] = shift.time.split(' - ');
                csv += `"${day.date}","${shift.name}","${start}","${end}"\n`;
            }
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, 'schedule.csv');
}

function downloadICS() {
    if (!window.parsedSchedule) return;
    
    const ics = generateICS(window.parsedSchedule);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    downloadFile(blob, 'schedule.ics');
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
                // Create all-day Off event
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
                // Parse shift times
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
    // Parse "Monday, June 1, 2026" format
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

function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function copyCalendarURL() {
    if (!window.parsedSchedule) return;
    
    const ics = generateICS(window.parsedSchedule);
    navigator.clipboard.writeText(ics).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        showInfo('Failed to copy. Please download the ICS file instead.');
    });
}

function openInGoogleCalendar() {
    downloadICS();
    showInfo('ICS file downloaded! Go to Google Calendar > Settings > Import & Export > Select the downloaded file');
}

function openInAppleCalendar() {
    downloadICS();
    showInfo('ICS file downloaded! On iOS/Mac, email it to yourself or use Files app to import it to Calendar.');
}

function clearAll() {
    document.getElementById('scheduleInput').value = '';
    document.getElementById('outputSection').style.display = 'none';
    document.getElementById('errorMessage').classList.remove('show');
    window.parsedSchedule = null;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.className = 'error-message show';
}

function showInfo(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.className = 'error-message show info';
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 4000);
}