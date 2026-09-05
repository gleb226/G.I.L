import sys

file_path = r'A:\Sync\G.I.L\Site\js\availabilityCalendar.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            if (compareIsoDates(isoDate, state.checkIn) <= 0) {
                setSelection(isoDate, null);
                return;
            }

            setSelection(state.checkIn, isoDate);'''

replacement = '''            if (compareIsoDates(isoDate, state.checkIn) <= 0) {
                setSelection(isoDate, null);
                return;
            }

            let finalIsoDate = isoDate;
            if (diffInDays(state.checkIn, finalIsoDate) > 30) {
                finalIsoDate = formatIsoDate(addDays(parseIsoDate(state.checkIn), 30));
                alert(getText("calendar.max30Days", "Maximum booking duration is 30 days.", { lng: lang }));
            }

            setSelection(state.checkIn, finalIsoDate);'''

if target in content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content.replace(target, replacement))
    print('Updated availabilityCalendar.js')
else:
    print('Target not found.')
