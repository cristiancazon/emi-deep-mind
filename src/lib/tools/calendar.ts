export const calendarToolDeclaration = {
    name: "list_calendar_events",
    description: "Lists upcoming events from the user's Google Calendar. Use this to answer questions about the user's schedule, appointments, and what they have planned.",
    parameters: {
        type: "OBJECT",
        properties: {
            maxResults: {
                type: "INTEGER",
                description: "Maximum number of events to return. Default is 10."
            }
        }
    }
};

export async function listCalendarEvents(token: string, maxResults: number = 10) {
    if (!token) throw new Error("No access token provided");

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    // Detailed logging for debugging
    console.log('📅 Google Calendar API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
    });

    if (!response.ok) {
        // Get the error details from Google
        const errorBody = await response.text();
        console.error('📅 Google Calendar API Error Body:', errorBody);

        try {
            const errorJson = JSON.parse(errorBody);
            console.error('📅 Parsed Error:', errorJson);
        } catch (e) {
            // Not JSON, just log the text
        }

        if (response.status === 401) {
            throw new Error("Authentication failed. Please sign in again.");
        } else if (response.status === 403) {
            throw new Error("Calendar access denied. Please grant calendar permissions.");
        } else if (response.status === 404) {
            throw new Error("Calendar not found.");
        } else {
            throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
        }
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
        return "No upcoming events found.";
    }

    // Return enriched event data
    return data.items.map((event: any) => ({
        summary: event.summary || "Untitled Event",
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        description: event.description || null,
        location: event.location || null,
        attendees: event.attendees?.map((a: any) => a.email) || [],
        link: event.htmlLink,
        status: event.status
    }));
}
