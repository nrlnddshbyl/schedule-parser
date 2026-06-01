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

function clearAll() {
    document.getElementById('scheduleInput').value = '';
    document.getElementById('outputSection').style.display = 'none';
    document.getElementById('errorMessage').classList.remove('show');
    window.parsedSchedule = null;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}
