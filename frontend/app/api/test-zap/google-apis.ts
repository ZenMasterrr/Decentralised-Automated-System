import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';


const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


export function setGoogleCredentials(accessToken: string, refreshToken?: string) {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}


export async function addRowToSheet(
  spreadsheetId: string,
  sheetName: string,
  values: any[],
  range?: string
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    
    const targetRange = range || `${sheetName}!A1`;
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: targetRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    return {
      success: true,
      message: `Successfully added row to sheet ${sheetName}`,
      details: {
        spreadsheetId,
        sheetName,
        updatedRange: response.data.updates?.updatedRange,
        updatedRows: response.data.updates?.updatedRows,
      },
    };
  } catch (error) {
    console.error('Error adding row to Google Sheets:', error);
    return {
      success: false,
      message: `Failed to add row to sheet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}


export async function createCalendarEvent(
  eventTitle: string,
  eventDescription: string,
  startDateTime: string, 
  endDateTime: string,
  sendNotifications: boolean = true
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const event = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC', 
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: sendNotifications ? [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ] : [],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendNotifications: sendNotifications,
    });

    return {
      success: true,
      message: `Successfully created calendar event: ${eventTitle}`,
      details: {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        startTime: response.data.start?.dateTime,
        endTime: response.data.end?.dateTime,
      },
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return {
      success: false,
      message: `Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}


export async function searchGmail(
  query: string,
  maxResults: number = 10
): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      return {
        success: true,
        messages: [],
      };
    }

    
    const messages = await Promise.all(
      response.data.messages.map(async (msg: any) => {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
        });
        return fullMessage.data;
      })
    );

    return {
      success: true,
      messages,
    };
  } catch (error) {
    console.error('Error searching Gmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


export function parseDateTime(dateField: string, timeField: string): string {
  
  if (dateField.includes('T')) {
    return dateField;
  }
  
  
  const dateParts = dateField.split('-');
  if (dateParts.length !== 3) {
    throw new Error(`Invalid date format: ${dateField}. Expected format: YYYY-MM-DD or YYYY-M-D`);
  }
  
  const year = dateParts[0];
  const month = dateParts[1].padStart(2, '0');
  const day = dateParts[2].padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  
  
  const timeParts = timeField.split(':');
  if (timeParts.length < 2) {
    throw new Error(`Invalid time format: ${timeField}. Expected format: HH:MM or H:M`);
  }
  
  const hours = timeParts[0].padStart(2, '0');
  const minutes = timeParts[1].padStart(2, '0');
  const seconds = timeParts[2] ? timeParts[2].padStart(2, '0') : '00';
  const formattedTime = `${hours}:${minutes}:${seconds}`;
  
  
  const dateTime = `${formattedDate}T${formattedTime}`;
  
  
  const date = new Date(dateTime);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date/time format: ${dateTime}`);
  }
  
  return dateTime;
}


export function calculateEndTime(startDateTime: string, durationMinutes: number): string {
  
  let dateTimeWithTz = startDateTime;
  if (!startDateTime.includes('Z') && !startDateTime.includes('+') && !startDateTime.includes('T')) {
    
    throw new Error(`Invalid datetime format: ${startDateTime}`);
  }
  
  
  if (startDateTime.includes('T') && !startDateTime.includes('Z') && !startDateTime.match(/[+-]\d{2}:\d{2}$/)) {
    dateTimeWithTz = startDateTime + 'Z';
  }
  
  const startDate = new Date(dateTimeWithTz);
  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid start date: ${startDateTime}`);
  }
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return endDate.toISOString();
}
