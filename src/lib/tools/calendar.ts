export const calendarTools = [
    {
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
    },
    {
        name: "add_calendar_event",
        description: "Adds a new event to the user's Google Calendar.",
        parameters: {
            type: "OBJECT",
            required: ["summary", "startDateTime", "endDateTime"],
            properties: {
                summary: {
                    type: "STRING",
                    description: "The title or summary of the event."
                },
                description: {
                    type: "STRING",
                    description: "A description of the event (optional)."
                },
                location: {
                    type: "STRING",
                    description: "The location of the event (optional)."
                },
                startDateTime: {
                    type: "STRING",
                    description: "The start time of the event in ISO 8601 format (e.g., '2023-10-27T10:00:00-03:00')."
                },
                endDateTime: {
                    type: "STRING",
                    description: "The end time of the event in ISO 8601 format."
                }
            }
        }
    },
    {
        name: "update_calendar_event",
        description: "Updates an existing event in the user's Google Calendar. You usually need to list events first to get the eventId.",
        parameters: {
            type: "OBJECT",
            required: ["eventId"],
            properties: {
                eventId: {
                    type: "STRING",
                    description: "The unique identifier of the event to update."
                },
                summary: {
                    type: "STRING",
                    description: "The new title of the event."
                },
                description: {
                    type: "STRING",
                    description: "The new description."
                },
                location: {
                    type: "STRING",
                    description: "The new location."
                },
                startDateTime: {
                    type: "STRING",
                    description: "The new start time in ISO 8601 format."
                },
                endDateTime: {
                    type: "STRING",
                    description: "The new end time in ISO 8601 format."
                }
            }
        }
    },
    {
        name: "delete_calendar_event",
        description: "Deletes an event from the user's Google Calendar. You usually need to list events first to get the eventId.",
        parameters: {
            type: "OBJECT",
            required: ["eventId"],
            properties: {
                eventId: {
                    type: "STRING",
                    description: "The unique identifier of the event to delete."
                }
            }
        }
    }
];

// Keep the old export for backward compatibility if needed, but the new array is preferred
export const calendarToolDeclaration = calendarTools[0];

export async function listCalendarEvents(token: string, maxResults: number = 10) {
    if (!token) throw new Error("No access token provided");

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        await handleCalendarError(response);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
        return "No upcoming events found.";
    }

    // Return enriched event data
    return data.items.map((event: any) => ({
        id: event.id,
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

export async function addCalendarEvent(token: string, event: { summary: string; description?: string; location?: string; startDateTime: string; endDateTime: string }) {
    if (!token) throw new Error("No access token provided");

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

    // Helper to ensure ISO format
    const ensureIsoDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) throw new Error("Invalid date");
            return date.toISOString();
        } catch (e) {
            throw new Error(`Invalid date format provided: ${dateStr}. Please use ISO 8601.`);
        }
    };

    const body = {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: { dateTime: ensureIsoDate(event.startDateTime) },
        end: { dateTime: ensureIsoDate(event.endDateTime) }
    };

    console.log('📅 Adding Event Payload:', JSON.stringify(body, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        await handleCalendarError(response);
    }

    const data = await response.json();
    return {
        status: "success",
        message: "Event created successfully",
        link: data.htmlLink,
        id: data.id
    };
}

export async function updateCalendarEvent(token: string, eventId: string, updates: { summary?: string; description?: string; location?: string; startDateTime?: string; endDateTime?: string }) {
    if (!token) throw new Error("No access token provided");

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const body: any = {};
    if (updates.summary) body.summary = updates.summary;
    if (updates.description) body.description = updates.description;
    if (updates.location) body.location = updates.location;
    if (updates.startDateTime) body.start = { dateTime: updates.startDateTime };
    if (updates.endDateTime) body.end = { dateTime: updates.endDateTime };

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        await handleCalendarError(response);
    }

    const data = await response.json();
    return {
        status: "success",
        message: "Event updated successfully",
        link: data.htmlLink
    };
}

export async function deleteCalendarEvent(token: string, eventId: string) {
    if (!token) throw new Error("No access token provided");

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        await handleCalendarError(response);
    }

    return {
        status: "success",
        message: "Event deleted successfully"
    };
}

async function handleCalendarError(response: Response) {
    const errorBody = await response.text();
    console.error('📅 Google Calendar API Error Body:', errorBody);

    try {
        const errorJson = JSON.parse(errorBody);
        console.error('📅 Parsed Error:', errorJson);
    } catch (e) {
        // Not JSON
    }

    if (response.status === 401) {
        throw new Error("Authentication failed. Please sign in again.");
    } else if (response.status === 403) {
        throw new Error("Calendar access denied. Please grant calendar permissions.");
    } else if (response.status === 404) {
        throw new Error("Event or Calendar not found.");
    } else {
        throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
    }
}
